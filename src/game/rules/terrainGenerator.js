/**
 * terrainGenerator.js — Seeded terrain generation algorithm.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 *
 * Elevation and moisture use FBM simplex noise (smooth, continuous fields).
 * Biome assignment is per-hex when multi-biome mode is active, producing
 * organic, noise-driven boundaries instead of straight chunk-grid edges.
 *
 * Supports per-chunk generation (generateChunkTiles) for chunk infrastructure,
 * and a backward-compatible generateTiles wrapper that assembles all chunks
 * into a flat map.
 *
 * Chunk boundaries are seamless: every tile uses its global (q, r) coordinates
 * for noise sampling, so adjacent chunks produce matching terrain at their
 * shared edge without communication.
 */
import { seededNoise, stringSeed } from '../../engine/rules/seededRng.js';
import { hexFbm2D, hexToWorld } from '../../engine/rules/noise.js';
import { coordKey, distance, neighbors } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';
import { DEFAULT_THRESHOLDS, DEFAULT_FEATURES } from './terrainTypes.js';
import { tileToChunk, localCoord, localKey, hexesInChunk } from '../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import { getArchetype } from './archetypes.js';
import {
  NOISE_CHANNEL_FEATURES, NOISE_CHANNEL_DEBRIS, NOISE_CHANNEL_DEBRIS_KIND,
  DEBRIS_SPAWN_THRESHOLD, DEBRIS_TUFT_THRESHOLD, DEBRIS_ROCK_THRESHOLD,
  MOUNTAIN_PEAK_MIN_NEIGHBORS, WATER_BFS_MAX_DEPTH, OCEAN_EDGE_BUFFER,
  FLOATING_ISLAND_THRESHOLD, PEAK_THRESHOLD, DENSE_FOREST_MIN_MOISTURE,
  NOISE_ELEVATION, NOISE_MOISTURE, NOISE_BIOME,
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
  NOISE_PHASE_A_ELEVATION, NOISE_TEMP_VARIATION, NOISE_REGION,
  SEED_ELEVATION, SEED_MOISTURE, SEED_TEMP, SEED_REGION_M, SEED_REGION_T,
  DEFAULT_TERRAIN_RULES,
} from '../../params/game/worldParams.js';
import { TERRAIN_ELEVATION } from '../../params/render/terrainParams.js';

// ---------------------------------------------------------------------------
// Biome distribution (multi-biome mode, per-hex)
// ---------------------------------------------------------------------------

const BIOME_DISTRIBUTION = [
  { limit: 0.40, id: 'biome_default' },
  { limit: 0.70, id: 'biome_lush' },
  { limit: 1.00, id: 'biome_arid' },
];

/**
 * Map a noise roll [0, 1) to a biome ID from the distribution table.
 */
function biomeForRoll(roll) {
  for (const entry of BIOME_DISTRIBUTION) {
    if (roll < entry.limit) return entry.id;
  }
  return 'biome_default';
}

// ---------------------------------------------------------------------------
// Phase A: sampleBaseFields
// ---------------------------------------------------------------------------

/**
 * Sample base physical fields at a global hex coordinate.
 *
 * Phase A elevation: single additive FBM (worldShape stub = 1.0).
 * Ridge layer sampled but weight is 0 until Phase B.
 *
 * @param {number} baseSeed    - Integer seed from stringSeed(seedText)
 * @param {number} q           - Global hex q coordinate
 * @param {number} r           - Global hex r coordinate
 * @param {object} noiseConfig - { PHASE_A_ELEVATION, MOISTURE, TEMP_VARIATION, REGION,
 *                                SEED_ELEVATION, SEED_MOISTURE, SEED_TEMP,
 *                                SEED_REGION_M, SEED_REGION_T }
 * @param {number} radius      - Map radius in hexes
 * @returns {{ elevation, rawLayers, baseMoisture, temperature, regionBiasM, regionBiasT }}
 */
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Elevation: single additive field (worldShape applied in Phase B)
  const detail  = hexFbm2D(q, r, baseSeed + NC.SEED_ELEVATION, NC.PHASE_A_ELEVATION);
  const ridges  = 0;  // Phase A: ridge weight = 0. Full composite in Phase B.
  const elevation = clamp01(detail);

  // Moisture: raw FBM, no water adjustment yet (Phase C)
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);

  // Temperature: world-space Y latitude + lapse rate + local variation
  const { y } = hexToWorld(q, r);
  const worldRadiusY  = radius * 1.7320508;
  const latitudeTerm  = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const RULES = DEFAULT_TERRAIN_RULES;
  const temperature = clamp01(
    0.5 + 0.35 * (latitudeTerm - 0.5)
        + 0.10 * (tempVariation - 0.5)
        - 0.30 * (elevation - RULES.waterMaxElevation)
  );

  // Region bias: two independent low-frequency fields
  const regionBiasM = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_M, NC.REGION);
  const regionBiasT = hexFbm2D(q, r, baseSeed + NC.SEED_REGION_T, NC.REGION);

  return {
    elevation,
    rawLayers: { detail, ridges },
    baseMoisture,
    temperature,
    regionBiasM,
    regionBiasT,
  };
}

// ---------------------------------------------------------------------------
// Phase A: selectBiome (data-driven natural biome selection)
// ---------------------------------------------------------------------------

/** Natural biomes — climate-driven, in specificity order. biome_default is last (catch-all). */
const BIOME_PRIORITY_ORDER = [
  'biome_arid',    // hot + dry (more specific)
  'biome_lush',    // wet + warm
  'biome_default', // catch-all — last, always matches
];

/** Supernatural biomes — placed by jittered-grid epicenter pass (A8), never by climate. */
const SUPERNATURAL_BIOMES = [
  // 'biome_unfinished_lands',  // uncomment in Phase G
  // 'biome_brass_grave',
];

/**
 * Select a natural biome ID from climate fields + regional bias.
 *
 * Iterates BIOME_PRIORITY_ORDER in sequence. First biome whose climateRange
 * constraints ALL match wins. Biomes without climateRange (not yet classified)
 * are skipped — they fall through to biome_default at the end.
 *
 * Regional bias applies small per-axis jitter (±5% per field) so biome
 * boundaries are softened by low-frequency noise, not hard climate cuts.
 *
 * @param {number} elevation   - [0, 1] elevation field
 * @param {number} moisture    - [0, 1] raw moisture field
 * @param {number} temperature - [0, 1] temperature field
 * @param {number} regionBiasM - [0, 1] moisture bias field
 * @param {number} regionBiasT - [0, 1] temperature bias field
 * @returns {string} biome archetype ID
 */
export function selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT) {
  const m = clamp01(moisture    + (regionBiasM - 0.5) * 0.10);
  const t = clamp01(temperature + (regionBiasT - 0.5) * 0.10);

  for (const biomeId of BIOME_PRIORITY_ORDER) {
    const def = getArchetype(biomeId);
    if (!def) continue;

    const R = def.climateRange;

    // Biomes without climateRange haven't been classified. Skip —
    // they fall through to biome_default at the end.
    if (!R) continue;

    // All specified constraints must be satisfied
    if (R.minElevation   !== undefined && elevation   < R.minElevation)   continue;
    if (R.maxElevation   !== undefined && elevation   > R.maxElevation)   continue;
    if (R.minMoisture    !== undefined && m            < R.minMoisture)    continue;
    if (R.maxMoisture    !== undefined && m            > R.maxMoisture)    continue;
    if (R.minTemperature !== undefined && t            < R.minTemperature) continue;
    if (R.maxTemperature !== undefined && t            > R.maxTemperature) continue;

    return biomeId;
  }

  return 'biome_default';
}

// ---------------------------------------------------------------------------
// Phase A: classifyTerrain (climate-aware, uses biomeDef.terrainRules)
// ---------------------------------------------------------------------------

/**
 * Determine terrain type from elevation, moisture, temperature, and biome rules.
 *
 * Temperature gates: cold water → ice, cold peaks → snow-capped peak.
 * Tree line prevents forests above treeLineMax.
 * Uses DEFAULT_TERRAIN_RULES merged with biome-specific terrainRules.
 *
 * @param {number} elevation   - [0, 1] elevation field
 * @param {number} moisture    - [0, 1] moisture field
 * @param {number} temperature - [0, 1] temperature field
 * @param {object} [biomeDef]  - Biome archetype def (read for terrainRules)
 * @returns {string} terrain type
 */
export function classifyTerrain(elevation, moisture, temperature, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven; frozen at low temperature
  if (elevation < R.waterMaxElevation) {
    if (temperature < R.freezeTempMax) return 'ice';
    if (moisture > R.waterMinMoisture) return 'water';
  }

  // Snow-capped peaks: high elevation + cold
  if (elevation > R.peakThreshold && temperature < R.snowLineMax) return 'peak';

  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';
  if (elevation > R.peakThreshold)          return 'peak';
  if (elevation > R.mountainThreshold)      return 'mountain';

  const belowTreeLine = elevation < R.treeLineMax;

  if (belowTreeLine && moisture > R.denseForestMinMoisture) return 'denseForest';
  if (belowTreeLine && moisture > R.forestMinMoisture)      return 'forest';
  if (moisture < R.desertMaxMoisture)                       return 'desert';
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation) return 'marsh';

  return 'plains';
}

// ---------------------------------------------------------------------------
// Threshold helpers (legacy — consumed by old generateChunkTiles pipeline)
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

function resolveElevation(terrain, T) {
  if (T.terrainElevation && T.terrainElevation[terrain] !== undefined) {
    return T.terrainElevation[terrain];
  }
  return TERRAIN_ELEVATION[terrain] || 0;
}

/**
 * Determine terrain type from elevation, moisture, and biome properties.
 */
function _classifyTerrainLegacy(elevation, moisture, T) {
  if (T.supportsFloatingIslands && elevation > T.floatingIslandThreshold) {
    return 'floatingIsland';
  }
  if (elevation > T.peakThreshold) return 'peak';
  if (elevation > T.mtThreshold) return 'mountain';
  if (elevation < T.waterThreshold && moisture > T.waterMinMoisture) return 'water';
  if (moisture > T.denseForestMinMoisture) return 'denseForest';
  if (moisture > T.forestMinMoisture) return 'forest';
  if (moisture < T.desertMaxMoisture) return 'desert';
  if (moisture > T.marshMinMoisture && elevation < T.marshMaxElevation) return 'marsh';
  return 'plains';
}

// ---------------------------------------------------------------------------
// Local mountain type tagging (no flood-fill)
// ---------------------------------------------------------------------------

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
  const elev = hexFbm2D(q, r, seed, NOISE_ELEVATION) * T.heightMult;
  const moist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE) + T.moistureBias;
  return elev < T.waterThreshold && moist > T.waterMinMoisture;
}

// ---------------------------------------------------------------------------
// Feature spawn helpers
// ---------------------------------------------------------------------------

function spawnFeature(roll, terrain, features) {
  for (const rule of features) {
    if (rule.terrainExclude && rule.terrainExclude.includes(terrain)) continue;

    let matched = false;
    if (rule.compare === 'gt' && roll > rule.threshold) matched = true;
    else if (rule.compare === 'lt' && roll < rule.threshold) matched = true;

    if (!matched) continue;

    switch (rule.kind) {
      case 'tree':
      case 'largeTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium' : 'sparse';
        return { kind: rule.kind, density };
      }
      case 'fruitTree': {
        const density = terrain === 'forest' || terrain === 'denseForest' ? 'dense'
          : terrain === 'plains' ? 'medium' : 'sparse';
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
 * Biome assignment is per-hex: when biomeDef is provided (single-biome mode),
 * all tiles use that biome. When biomeDef is null (multi-biome mode), each
 * tile independently samples FBM noise to determine its biome from the
 * BIOME_DISTRIBUTION table — boundaries are organic, not chunk-aligned.
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   chunkQ    - Chunk q coordinate
 * @param {number}   chunkR    - Chunk r coordinate
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype def, or null for multi-biome
 * @param {object}   [params]  - Map parameter multipliers
 * @returns {{ tileMap: Map<string, object>, biomeId: string|null }}
 */
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef = null, params = {}) {
  const seed = stringSeed(seedText);

  // Fallback thresholds for out-of-chunk neighbor checks (mountain/water tagging).
  // Use the provided biomeDef, or default biome as a reasonable approximation.
  const fallbackBiomeDef = biomeDef || getArchetype('biome_default');
  const fallbackT = resolveThresholds(fallbackBiomeDef, params);

  const tileMap = new Map();

  // Collect all hex coordinates in this chunk that are within the map radius
  const candidates = hexesInChunk(chunkQ, chunkR).filter(({ q, r }) => {
    const s = -q - r;
    return Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius;
  });

  // --- Pass 1: Generate base terrain (per-hex biome, FBM noise) ---
  for (const { q, r } of candidates) {
    // Resolve biome per-hex
    let hexBiomeDef;
    let hexBiomeId;
    if (biomeDef) {
      hexBiomeDef = biomeDef;
      hexBiomeId = biomeDef.id;
    } else {
      hexBiomeId = biomeForRoll(hexFbm2D(q, r, seed + 1999, NOISE_BIOME));
      hexBiomeDef = getArchetype(hexBiomeId) || getArchetype('biome_default');
    }

    const T = resolveThresholds(hexBiomeDef, params);

    // Sample continuous noise fields at hex world-space position
    const rawElev = hexFbm2D(q, r, seed, NOISE_ELEVATION);
    const rawMoist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE);
    const elevation = rawElev * T.heightMult;
    const moisture = clamp01(rawMoist + T.moistureBias);
    const terrain = _classifyTerrainLegacy(elevation, moisture, T);

    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    const elev = resolveElevation(terrain, T);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null,
      mountainType: null, waterType: null, debris: null,
      elevation: elev,
      rawElev, rawMoist,
      biomeId: hexBiomeId,
    });
  }

  // --- Pass 2: Local mountain type tagging ---
  const tileLookup = (nq, nr) => {
    const { cq, cr } = tileToChunk(nq, nr);
    if (cq === chunkQ && cr === chunkR) {
      const { lq, lr } = localCoord(chunkQ, chunkR, nq, nr);
      return tileMap.get(localKey(lq, lr)) || undefined;
    }
    // Out of chunk — approximate terrain from fallback thresholds + FBM
    const elevation = hexFbm2D(nq, nr, seed, NOISE_ELEVATION) * fallbackT.heightMult;
    const moisture = clamp01(hexFbm2D(nq, nr, seed + 999, NOISE_MOISTURE) + fallbackT.moistureBias);
    const terrain = _classifyTerrainLegacy(elevation, moisture, fallbackT);
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
      tile.waterType = waterTypeForTile(seed, tile.q, tile.r, radius, fallbackT, tileLookup);
    }
  }

  // --- Pass 4: Sprinkle features (flora + resources from biome features list) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    // Resolve features from the tile's own biome (re-read from biome ID)
    const tileBiomeDef = biomeDef || getArchetype(tile.biomeId) || getArchetype('biome_default');
    const T = resolveThresholds(tileBiomeDef, params);
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

  return { tileMap, biomeId: biomeDef?.id || null };
}

// ---------------------------------------------------------------------------
// Backward-compatible flat tile generation (wraps per-chunk generation)
// ---------------------------------------------------------------------------

/**
 * Generate a flat tile map for a given seed and radius.
 * Delegates to generateChunkTiles for each chunk in range and assembles
 * the results into a single flat object keyed by "q,r".
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype definition, or null for multi-biome
 * @param {object}   [params]  - Map parameter multipliers
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, params = {}) {
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
    const { tileMap } = generateChunkTiles(seedText, cq, cr, radius, biomeDef, params);
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
