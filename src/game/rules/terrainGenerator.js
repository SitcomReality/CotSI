/**
 * terrainGenerator.js — Seeded terrain generation algorithm.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 *
 * Supports per-chunk generation (generateChunkTiles) for Phase 2 chunk
 * infrastructure, and a backward-compatible generateTiles wrapper that
 * assembles all chunks into a flat map.
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

// ---------------------------------------------------------------------------
// Threshold helpers
// ---------------------------------------------------------------------------

function resolveThresholds(biomeDef, params) {
  const thresholds = biomeDef?.terrainThresholds || DEFAULT_THRESHOLDS;
  const features = biomeDef?.featureFrequencies || DEFAULT_FEATURES;

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

  const treeThreshold = features.tree?.threshold ?? 0.935;
  const treeExclude = features.tree?.exclude ?? ['desert'];
  const knotThreshold = features.knot?.threshold ?? 0.038;

  return {
    heightMult, mtThreshold, waterThreshold, waterMinMoisture,
    forestMinMoisture, desertMaxMoisture, marshMinMoisture, marshMaxElevation,
    treeThreshold, treeExclude, knotThreshold,
  };
}

/**
 * Determine terrain type from elevation and moisture.
 */
function classifyTerrain(elevation, moisture, T) {
  if (elevation > T.mtThreshold) return 'mountain';
  if (elevation < T.waterThreshold && moisture > T.waterMinMoisture) return 'water';
  if (moisture > T.forestMinMoisture) return 'forest';
  if (moisture < T.desertMaxMoisture) return 'desert';
  if (moisture > T.marshMinMoisture && elevation < T.marshMaxElevation) return 'marsh';
  return 'plains';
}

// ---------------------------------------------------------------------------
// Local mountain type tagging (no flood-fill)
// ---------------------------------------------------------------------------

/**
 * Tag a mountain tile as 'peak', 'slope', or 'isolated' based purely on
 * local neighbor count within the tile set. No flood-fill needed.
 *
 * @param {object} tile - The mountain tile to tag (mutated in place)
 * @param {object} tileLookup - Function (q, r) => tile or undefined
 */
function tagMountainType(tile, tileLookup) {
  const nbrs = neighbors({ q: tile.q, r: tile.r });
  let mtCount = 0;
  for (const n of nbrs) {
    const nTile = tileLookup(n.q, n.r);
    if (nTile && nTile.terrain === 'mountain') mtCount++;
  }
  if (mtCount === 0) {
    tile.mountainType = 'isolated';
  } else if (mtCount >= 4) {
    tile.mountainType = 'peak';
  } else {
    tile.mountainType = 'slope';
  }
}

// ---------------------------------------------------------------------------
// Local water type tagging (bounded BFS to depth 3)
// ---------------------------------------------------------------------------

/**
 * Determine whether a water tile is 'lake' or 'ocean' using a bounded BFS
 * to depth 3. A water tile that is connected (within 3 steps) to the map
 * edge is ocean; otherwise lake.
 *
 * @param {number} seed  - Integer seed for noise sampling
 * @param {number} q     - Global tile q
 * @param {number} r     - Global tile r
 * @param {number} radius - Map radius (for edge detection)
 * @param {object} T     - Resolved thresholds
 * @param {function} tileLookup - (q, r) => tile or undefined for existing tiles
 * @returns {'lake'|'ocean'}
 */
function waterTypeForTile(seed, q, r, radius, T, tileLookup) {
  // If this tile itself touches the map edge, it's ocean immediately
  if (distance({ q: 0, r: 0 }, { q, r }) >= radius - 0.5) {
    return 'ocean';
  }

  // Bounded BFS: check water-connected tiles within depth 3 for edge contact
  const seen = new Set();
  const queue = [{ q, r, depth: 0 }];
  seen.add(`${q},${r}`);

  while (queue.length) {
    const cur = queue.shift();
    if (cur.depth >= 3) continue;

    for (const n of neighbors({ q: cur.q, r: cur.r })) {
      const nk = `${n.q},${n.r}`;
      if (seen.has(nk)) continue;
      seen.add(nk);

      // Check if this neighbor exists in the tile set
      const existing = tileLookup(n.q, n.r);
      const isWater = existing
        ? existing.terrain === 'water'
        : _noiseIsWater(seed, n.q, n.r, T);

      if (!isWater) continue;

      // Check if this water tile touches the map edge
      if (distance({ q: 0, r: 0 }, { q: n.q, r: n.r }) >= radius - 0.5) {
        return 'ocean';
      }

      queue.push({ q: n.q, r: n.r, depth: cur.depth + 1 });
    }
  }

  return 'lake';
}

/**
 * Check whether a tile at (q, r) would be water based purely on noise.
 * Used for neighbours that may not have been generated yet.
 */
function _noiseIsWater(seed, q, r, T) {
  const elev = seededNoise(seed, q, r, 1) * T.heightMult;
  const moist = seededNoise(seed, q, r, 2);
  return elev < T.waterThreshold && moist > T.waterMinMoisture;
}

// ---------------------------------------------------------------------------
// Per-chunk generation
// ---------------------------------------------------------------------------

/**
 * Generate tiles for a single chunk. Tiles within the chunk that fall
 * outside the map radius are excluded.
 *
 * The returned Map is keyed by local coords ("lq,lr"), each value is a
 * full tile object with global { q, r, terrain, feature, mountainType,
 * waterType, debris }.
 *
 * @param {string}  seedText    - Seed string for reproducible generation
 * @param {number}  chunkQ      - Chunk q coordinate
 * @param {number}  chunkR      - Chunk r coordinate
 * @param {number}  radius      - Hex map radius (center 0,0)
 * @param {object}  [biomeDef]  - Resolved biome archetype def, or null
 * @param {object}  [params]    - Map parameter multipliers
 * @returns {Map<string, object>} localKey → tile data
 */
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef = null, params = {}) {
  const seed = stringSeed(seedText);
  const T = resolveThresholds(biomeDef, params);

  const tileMap = new Map();

  // Collect all hex coordinates in this chunk that are within the map radius
  const candidates = hexesInChunk(chunkQ, chunkR).filter(({ q, r }) => {
    const s = -q - r;
    return Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius;
  });

  // --- Pass 1: Generate base terrain ---
  for (const { q, r } of candidates) {
    const elevation = seededNoise(seed, q, r, 1) * T.heightMult;
    const moisture = seededNoise(seed, q, r, 2);
    const terrain = classifyTerrain(elevation, moisture, T);
    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    tileMap.set(localKey(lq, lr), { q, r, terrain, feature: null, mountainType: null, waterType: null, debris: null });
  }

  // --- Pass 2: Local mountain type tagging ---
  // Build a lookup function that checks the current chunk first, then
  // falls back to noise for out-of-chunk neighbors (for boundary correctness).
  const tileLookup = (nq, nr) => {
    const { cq, cr } = tileToChunk(nq, nr);
    if (cq === chunkQ && cr === chunkR) {
      const { lq, lr } = localCoord(chunkQ, chunkR, nq, nr);
      return tileMap.get(localKey(lq, lr)) || undefined;
    }
    // Out of chunk — compute terrain from noise
    const elevation = seededNoise(seed, nq, nr, 1) * T.heightMult;
    const moisture = seededNoise(seed, nq, nr, 2);
    const terrain = classifyTerrain(elevation, moisture, T);
    return terrain === 'mountain' ? { terrain: 'mountain', q: nq, r: nr } : undefined;
  };

  for (const [, tile] of tileMap) {
    if (tile.terrain === 'mountain') {
      tagMountainType(tile, tileLookup);
    }
  }

  // --- Pass 3: Local water type tagging ---
  for (const [, tile] of tileMap) {
    if (tile.terrain === 'water') {
      tile.waterType = waterTypeForTile(seed, tile.q, tile.r, radius, T, tileLookup);
    }
  }

  // --- Pass 4: Sprinkle features (trees, knots) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    const roll = seededNoise(seed, tile.q, tile.r, 4);
    if (roll > T.treeThreshold && !T.treeExclude.includes(tile.terrain)) {
      const density = tile.terrain === 'forest' ? 'dense'
        : tile.terrain === 'plains' ? 'medium'
        : 'sparse';
      tile.feature = { kind: 'tree', nextFruitDay: 1, ripe: true, density };
    } else if (roll < T.knotThreshold) {
      tile.feature = { kind: 'knot', mined: false, amount: 2 + Math.floor(roll * 100) % 3 };
    }
  }

  // --- Pass 5: Environmental debris (grass tufts, rocks, flowers) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    if (tile.feature) continue;
    const debrisRoll = seededNoise(seed, tile.q, tile.r, 5);
    if (debrisRoll > 0.92) {
      const kindRoll = seededNoise(seed, tile.q, tile.r, 6);
      const kind = kindRoll < 0.4 ? 'tuft'
        : kindRoll < 0.7 ? 'rock'
        : 'flower';
      tile.debris = { kind };
    }
  }

  return tileMap;
}

// ---------------------------------------------------------------------------
// Backward-compatible flat tile generation (wraps per-chunk generation)
// ---------------------------------------------------------------------------

/**
 * Generate a flat tile map for a given seed and radius.
 * Delegates to generateChunkTiles for each chunk in range and assembles
 * the results into a single flat object keyed by "q,r".
 *
 * This is the backward-compatible entry point used by gameFactory.js and
 * any code that hasn't been migrated to chunk-aware accessors yet.
 *
 * @param {string}  seedText     - Seed string for reproducible generation
 * @param {number}  radius       - Hex map radius (center 0,0)
 * @param {object}  [biomeDef]   - Resolved biome archetype definition, or null for defaults
 * @param {object}  [params]     - Map parameter multipliers
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, params = {}) {
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
    const chunkTiles = generateChunkTiles(seedText, cq, cr, radius, biomeDef, params);
    for (const [, tile] of chunkTiles) {
      tiles[coordKey(tile)] = tile;
    }
  }

  return tiles;
}
