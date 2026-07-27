/**
 * terrainGenerator.js — Seeded terrain generation algorithm.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 *
 * Supports per-chunk generation (generateChunkTiles) for Phase 2 chunk
 * infrastructure, and a backward-compatible generateTiles wrapper that
 * assembles all chunks into a flat map.
 *
 * Multi-biome mode: pass biomeLookup(chunkQ, chunkR) to assign different
 * biomes to different chunks via NOISE_CHANNEL_BIOME sampling.
 *
 * The global BFS passes (contiguous-land enforcement, mountain flood-fill
 * grouping, water flood-fill clustering) have been removed in favour of
 * noise-based local alternatives:
 *   - Mountain peaks: local noise-maxima detection (check 6 neighbors)
 *   - Water type: bounded BFS to depth 3 for lake vs ocean
 *   - Landmass shaping: domain-warped noise produces natural continents
 *     without post-processing (islands are acceptable per design)
 *
 * Chunk boundaries are seamless: every tile uses its global (q, r)
 * coordinates for noise sampling, so adjacent chunks produce matching
 * terrain at their shared edge without communication.
 */
import { seededNoise, stringSeed } from '../../engine/rules/seededRng.js';
import { coordKey, parseKey, distance, neighbors, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';
import { DEFAULT_THRESHOLDS, DEFAULT_FEATURES } from './terrainTypes.js';
import { tileToChunk, localCoord, localKey, hexesInChunk } from '../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import {
  NOISE_CHANNEL_ELEVATION, NOISE_CHANNEL_MOISTURE, NOISE_CHANNEL_BIOME,
  NOISE_CHANNEL_FEATURES, NOISE_CHANNEL_DEBRIS, NOISE_CHANNEL_DEBRIS_KIND,
  DEBRIS_SPAWN_THRESHOLD, DEBRIS_TUFT_THRESHOLD, DEBRIS_ROCK_THRESHOLD,
  MOUNTAIN_PEAK_MIN_NEIGHBORS, WATER_BFS_MAX_DEPTH, OCEAN_EDGE_BUFFER,
  FLOATING_ISLAND_THRESHOLD, PEAK_THRESHOLD, DENSE_FOREST_MIN_MOISTURE,
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
} from '../../params/game/worldParams.js';
import { TERRAIN_ELEVATION } from '../../params/render/terrainParams.js';

// ---------------------------------------------------------------------------
// Threshold helpers
// ---------------------------------------------------------------------------

function resolveThresholds(biomeDef, params) {
  const thresholds = biomeDef?.terrainThresholds || DEFAULT_THRESHOLDS;
  const features = biomeDef?.features || DEFAULT_FEATURES;
  const moistureBias = biomeDef?.moistureBias ?? 0;
  const terrainElevation = biomeDef?.terrainElevation || null;

  const heightMult = params.heightVariation ?? 1.0;
  const waterMult = params.wateriness ?? 1.0;
  const mountainMult = params.mountainousness ?? 1.0;

  const mtThreshold = thresholds.mountain?.minElevation !== undefined
    ? thresholds.mountain.minElevation / Math.max(0.1, mountainMult)
    : 0.905 / Math.max(0.1, mountainMult);
  const waterThreshold = thresholds.water?.maxElevation !== undefined
    ? thresholds.water.maxElevation * waterMult
    : 0.07 * waterMult;
  const waterMinMoisture = thresholds.water?.minMoisture ?? 0.5;
  const forestMinMoisture = thresholds.forest?.minMoisture ?? 0.72;
  const desertMaxMoisture = thresholds.desert?.maxMoisture ?? 0.20;
  const marshMinMoisture = thresholds.marsh?.minMoisture ?? 0.58;
  const marshMaxElevation = thresholds.marsh?.maxElevation ?? 0.35;

  // New terrain thresholds
  const denseForestMinMoisture = thresholds.denseForest?.minMoisture ?? DENSE_FOREST_MIN_MOISTURE;

  return {
    heightMult, mtThreshold, waterThreshold, waterMinMoisture,
    forestMinMoisture, desertMaxMoisture, marshMinMoisture, marshMaxElevation,
    denseForestMinMoisture,
    features, moistureBias, terrainElevation,
    supportsFloatingIslands: !!biomeDef?.supportsFloatingIslands,
    floatingIslandThreshold: FLOATING_ISLAND_THRESHOLD / Math.max(0.1, mountainMult),
    peakThreshold: PEAK_THRESHOLD / Math.max(0.1, mountainMult),
  };
}

/**
 * Resolve per-tile terrain elevation from biome terrainElevation overrides
 * or the global TERRAIN_ELEVATION default.
 */
function resolveElevation(terrain, T) {
  if (T.terrainElevation && T.terrainElevation[terrain] !== undefined) {
    return T.terrainElevation[terrain];
  }
  return TERRAIN_ELEVATION[terrain] || 0;
}

/**
 * Determine terrain type from elevation, moisture, and biome properties.
 */
function classifyTerrain(elevation, moisture, T) {
  // Floating island — extreme elevation, biome-gated
  if (T.supportsFloatingIslands && elevation > T.floatingIslandThreshold) {
    return 'floatingIsland';
  }
  // Peak — above mountain threshold
  if (elevation > T.peakThreshold) return 'peak';
  // Mountain
  if (elevation > T.mtThreshold) return 'mountain';
  // Water
  if (elevation < T.waterThreshold && moisture > T.waterMinMoisture) return 'water';
  // Dense forest (jungle/rainforest) — very high moisture
  if (moisture > T.denseForestMinMoisture) return 'denseForest';
  // Forest
  if (moisture > T.forestMinMoisture) return 'forest';
  // Desert
  if (moisture < T.desertMaxMoisture) return 'desert';
  // Marsh — high moisture + low elevation
  if (moisture > T.marshMinMoisture && elevation < T.marshMaxElevation) return 'marsh';
  // Default
  return 'plains';
}

// ---------------------------------------------------------------------------
// Local mountain type tagging (no flood-fill)
// ---------------------------------------------------------------------------

/**
 * Tag a mountain or peak tile as 'peak', 'slope', or 'isolated' based purely on
 * local neighbor count within the tile set. No flood-fill needed.
 *
 * @param {object} tile - The mountain/peak tile to tag (mutated in place)
 * @param {object} tileLookup - Function (q, r) => tile or undefined
 */
function tagMountainType(tile, tileLookup) {
  const nbrs = neighbors({ q: tile.q, r: tile.r });
  let mtCount = 0;
  for (const n of nbrs) {
    const nTile = tileLookup(n.q, n.r);
    if (nTile && (nTile.terrain === 'mountain' || nTile.terrain === 'peak' || nTile.terrain === 'floatingIsland')) {
      mtCount++;
    }
  }
  if (mtCount === 0) {
    tile.mountainType = 'isolated';
  } else if (mtCount >= MOUNTAIN_PEAK_MIN_NEIGHBORS) {
    tile.mountainType = 'peak';
  } else {
    tile.mountainType = 'slope';
  }
}

// ---------------------------------------------------------------------------
// Local water type tagging (bounded BFS to depth 3)
// ---------------------------------------------------------------------------

function waterTypeForTile(seed, q, r, radius, T, tileLookup) {
  if (distance({ q: 0, r: 0 }, { q, r }) >= radius - OCEAN_EDGE_BUFFER) {
    return 'ocean';
  }

  const seen = new Set();
  const queue = [{ q, r, depth: 0 }];
  seen.add(`${q},${r}`);

  while (queue.length) {
    const cur = queue.shift();
    if (cur.depth >= WATER_BFS_MAX_DEPTH) continue;

    for (const n of neighbors({ q: cur.q, r: cur.r })) {
      const nk = `${n.q},${n.r}`;
      if (seen.has(nk)) continue;
      seen.add(nk);

      const existing = tileLookup(n.q, n.r);
      const isWater = existing
        ? existing.terrain === 'water'
        : _noiseIsWater(seed, n.q, n.r, T);

      if (!isWater) continue;

      if (distance({ q: 0, r: 0 }, { q: n.q, r: n.r }) >= radius - OCEAN_EDGE_BUFFER) {
        return 'ocean';
      }

      queue.push({ q: n.q, r: n.r, depth: cur.depth + 1 });
    }
  }

  return 'lake';
}

function _noiseIsWater(seed, q, r, T) {
  const elev = seededNoise(seed, q, r, NOISE_CHANNEL_ELEVATION) * T.heightMult;
  const moist = seededNoise(seed, q, r, NOISE_CHANNEL_MOISTURE) + T.moistureBias;
  return elev < T.waterThreshold && moist > T.waterMinMoisture;
}

// ---------------------------------------------------------------------------
// Feature spawn helpers
// ---------------------------------------------------------------------------

/**
 * Determine which feature (if any) to spawn on a given tile based on the
 * biome's ordered features list. First matching rule wins.
 *
 * @param {number} roll  - Feature noise roll [0, 1)
 * @param {string} terrain - Tile terrain type
 * @param {object[]} features - Ordered array of feature spawn rules from the biome def
 * @returns {object|null} Feature descriptor, or null
 */
function spawnFeature(roll, terrain, features) {
  for (const rule of features) {
    // Check terrain exclusion
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;

    // Check noise threshold
    let matched = false;
    if (rule.compare === 'gt' && roll > rule.threshold) matched = true;
    else if (rule.compare === 'lt' && roll < rule.threshold) matched = true;

    if (!matched) continue;

    // Build feature descriptor based on kind
    switch (rule.kind) {
      case 'tree':
      case 'largeTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium'
          : 'sparse';
        return { kind: rule.kind, density };
      }
      case 'fruitTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium'
          : 'sparse';
        return { kind: 'fruitTree', nextFruitDay: 1, ripe: true, density };
      }
      case 'knot':
        return {
          kind: 'knot', mined: false,
          amount: KNOT_BASE_AMOUNT + Math.floor(roll * KNOT_AMOUNT_VARIATION_SCALE) % KNOT_AMOUNT_VARIATION_MOD,
        };
      case 'bush':
        return { kind: 'bush' };
      case 'vine':
        return { kind: 'vine' };
      default:
        return { kind: rule.kind };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Per-chunk generation
// ---------------------------------------------------------------------------

/**
 * Generate tiles for a single chunk. Tiles within the chunk that fall
 * outside the map radius are excluded.
 *
 * Supports multi-biome via biomeLookup(chunkQ, chunkR) — when provided,
 * each chunk independently resolves its biome. When null, the single
 * biomeDef is used for all tiles.
 *
 * @param {string}   seedText     - Seed string for reproducible generation
 * @param {number}   chunkQ       - Chunk q coordinate
 * @param {number}   chunkR       - Chunk r coordinate
 * @param {number}   radius       - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]   - Resolved biome archetype def, or null for defaults
 * @param {object}   [params]     - Map parameter multipliers
 * @param {function} [biomeLookup]- (chunkQ, chunkR) => biomeDef for multi-biome mode
 * @returns {{ tileMap: Map<string, object>, biomeId: string|null }}
 */
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef = null, params = {}, biomeLookup = null) {
  const seed = stringSeed(seedText);

  // Resolve the biome for this chunk (multi-biome or single)
  const resolvedBiomeDef = biomeLookup
    ? (biomeLookup(chunkQ, chunkR) || biomeDef)
    : biomeDef;

  const T = resolveThresholds(resolvedBiomeDef, params);

  const tileMap = new Map();

  // Collect all hex coordinates in this chunk that are within the map radius
  const candidates = hexesInChunk(chunkQ, chunkR).filter(({ q, r }) => {
    const s = -q - r;
    return Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius;
  });

  // --- Pass 1: Generate base terrain ---
  for (const { q, r } of candidates) {
    const elevation = seededNoise(seed, q, r, NOISE_CHANNEL_ELEVATION) * T.heightMult;
    const moisture = clamp01(seededNoise(seed, q, r, NOISE_CHANNEL_MOISTURE) + T.moistureBias);
    const terrain = classifyTerrain(elevation, moisture, T);
    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    const elev = resolveElevation(terrain, T);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null,
      mountainType: null, waterType: null, debris: null,
      elevation: elev,
      biomeId: resolvedBiomeDef?.id || null,
    });
  }

  // --- Pass 2: Local mountain type tagging ---
  const tileLookup = (nq, nr) => {
    const { cq, cr } = tileToChunk(nq, nr);
    if (cq === chunkQ && cr === chunkR) {
      const { lq, lr } = localCoord(chunkQ, chunkR, nq, nr);
      return tileMap.get(localKey(lq, lr)) || undefined;
    }
    // Out of chunk — compute terrain from noise
    const elevation = seededNoise(seed, nq, nr, NOISE_CHANNEL_ELEVATION) * T.heightMult;
    const moisture = clamp01(seededNoise(seed, nq, nr, NOISE_CHANNEL_MOISTURE) + T.moistureBias);
    const terrain = classifyTerrain(elevation, moisture, T);
    if (terrain === 'mountain' || terrain === 'peak') {
      return { terrain, q: nq, r: nr };
    }
    return undefined;
  };

  for (const [, tile] of tileMap) {
    if (tile.terrain === 'mountain' || tile.terrain === 'peak') {
      tagMountainType(tile, tileLookup);
    }
  }

  // --- Pass 3: Local water type tagging ---
  for (const [, tile] of tileMap) {
    if (tile.terrain === 'water') {
      tile.waterType = waterTypeForTile(seed, tile.q, tile.r, radius, T, tileLookup);
    }
  }

  // --- Pass 4: Sprinkle features (flora + resources from biome features list) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    const roll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_FEATURES);
    const feature = spawnFeature(roll, tile.terrain, T.features);
    if (feature) {
      tile.feature = feature;
    }
  }

  // --- Pass 5: Environmental debris (grass tufts, rocks, flowers) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    if (tile.feature) continue;
    const debrisRoll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_DEBRIS);
    if (debrisRoll > DEBRIS_SPAWN_THRESHOLD) {
      const kindRoll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_DEBRIS_KIND);
      const kind = kindRoll < DEBRIS_TUFT_THRESHOLD ? 'tuft'
        : kindRoll < DEBRIS_ROCK_THRESHOLD ? 'rock'
        : 'flower';
      tile.debris = { kind };
    }
  }

  return { tileMap, biomeId: resolvedBiomeDef?.id || null };
}

// ---------------------------------------------------------------------------
// Backward-compatible flat tile generation (wraps per-chunk generation)
// ---------------------------------------------------------------------------

/**
 * Generate a flat tile map for a given seed and radius.
 * Delegates to generateChunkTiles for each chunk in range and assembles
 * the results into a single flat object keyed by "q,r".
 *
 * @param {string}   seedText      - Seed string for reproducible generation
 * @param {number}   radius        - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]    - Resolved biome archetype definition, or null for defaults
 * @param {object}   [params]      - Map parameter multipliers
 * @param {function} [biomeLookup] - (chunkQ, chunkR) => biomeDef for multi-biome mode
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, params = {}, biomeLookup = null) {
  startMeasure('genTiles');

  // Determine which chunks intersect the map radius
  const chunks = new Set();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) > radius) continue;
      const { cq, cr } = tileToChunk(q, r);
      chunks.add(`${cq},${cr}`);
    }
  }

  const tiles = {};
  for (const ck of chunks) {
    const [cq, cr] = ck.split(',').map(Number);
    const { tileMap } = generateChunkTiles(seedText, cq, cr, radius, biomeDef, params, biomeLookup);
    for (const [, tile] of tileMap) {
      tiles[coordKey(tile)] = tile;
    }
  }

  endMeasure('genTiles');
  return tiles;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
