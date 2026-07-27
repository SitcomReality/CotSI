/**
 * terrainGenerator.js — Seeded terrain generation algorithm.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 *
 * Pipeline: sampleBaseFields() → selectBiome() → classifyTerrain().
 * Elevation, moisture, and temperature are sampled as continuous noise fields.
 * Biome assignment is climate-driven (selectBiome reads biomeDef.climateRange).
 * Terrain classification uses DEFAULT_TERRAIN_RULES merged with biome-specific
 * terrainRules, with temperature gates (ice, snow-capped peaks) and tree line.
 *
 * Supports per-chunk generation (generateChunkTiles) and a backward-compatible
 * generateTiles wrapper. Chunk boundaries are seamless: every tile uses its
 * global (q, r) coordinates for noise sampling.
 */
import { hash32, seededNoise, stringSeed } from '../../engine/rules/seededRng.js';
import { hexFbm2D, hexToWorld } from '../../engine/rules/noise.js';
import { coordKey, distance, neighbors } from '../../engine/rules/hexGrid.js';
import { TERRAIN, DEFAULT_FEATURES } from './terrainTypes.js';
import { tileToChunk, localCoord, localKey, hexesInChunk } from '../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import { getArchetype } from './archetypes.js';
import { SPAWN_CLEARANCE_RING } from '../../params/game/spawnParams.js';
import {
  NOISE_CHANNEL_FEATURES, NOISE_CHANNEL_DEBRIS, NOISE_CHANNEL_DEBRIS_KIND,
  DEBRIS_SPAWN_THRESHOLD, DEBRIS_TUFT_THRESHOLD, DEBRIS_ROCK_THRESHOLD,
  MOUNTAIN_PEAK_MIN_NEIGHBORS, WATER_BFS_MAX_DEPTH, OCEAN_EDGE_BUFFER,
  KNOT_BASE_AMOUNT, KNOT_AMOUNT_VARIATION_SCALE, KNOT_AMOUNT_VARIATION_MOD,
  NOISE_MOISTURE, NOISE_PHASE_A_ELEVATION, NOISE_TEMP_VARIATION, NOISE_REGION,
  SEED_ELEVATION, SEED_MOISTURE, SEED_TEMP, SEED_REGION_M, SEED_REGION_T,
  DEFAULT_TERRAIN_RULES, EPICENTER_GRID,
} from '../../params/game/worldParams.js';
import { TERRAIN_ELEVATION } from '../../params/render/terrainParams.js';

// ---------------------------------------------------------------------------
// Noise config bundle (shared by sampleBaseFields, _noiseIsWater, etc.)
// ---------------------------------------------------------------------------

const NOISE_CONFIG = {
  PHASE_A_ELEVATION: NOISE_PHASE_A_ELEVATION,
  MOISTURE: NOISE_MOISTURE,
  TEMP_VARIATION: NOISE_TEMP_VARIATION,
  REGION: NOISE_REGION,
  SEED_ELEVATION,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
};

// ---------------------------------------------------------------------------
// Sample base fields
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
  'biome_arid',    // hot + dry (most specific)
  'biome_savanna', // hot transitional — between arid and lush
  'biome_lush',    // wet + warm
  'biome_default', // catch-all — last, always matches
];

/** Supernatural biomes — placed by jittered-grid epicenter pass (A8), never by climate. */
const SUPERNATURAL_BIOMES = [
  // 'biome_unfinished_lands',  // uncomment in Phase G
  'biome_brass_grave',
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
 * @param {number} [slope=0]   - Slope [0, 1] (unused until Phase B; reserved for mountain/plateau/hill discrimination)
 * @returns {string} terrain type
 */
export function classifyTerrain(elevation, moisture, temperature, biomeDef, slope = 0) {
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

function resolveElevation(terrain, biomeDef) {
  if (biomeDef?.terrainElevation?.[terrain] !== undefined) {
    return biomeDef.terrainElevation[terrain];
  }
  return TERRAIN_ELEVATION[terrain] || 0;
}

// ---------------------------------------------------------------------------
// Epicenter system (supernatural biome placement — A8)
// ---------------------------------------------------------------------------

/**
 * Deterministic integer offset from a biome ID + tag pair.
 * Used to derive independent noise seeds per biome per purpose.
 */
function hashSeedOffset(biomeId, tag) {
  return stringSeed(biomeId + ':' + tag);
}

/**
 * Deterministic 2D position jitter within a grid cell.
 * Returns { q, r } offset in [-amplitude*cellSize/2, +amplitude*cellSize/2].
 */
function seededJitter(baseSeed, cellQ, cellR, cellSize, amplitude) {
  const hashQ = hash32(baseSeed ^ 0x4A1EBEAD ^ (cellQ * 0x9E3779B9) ^ (cellR * 0x7F4A7C2D));
  const hashR = hash32(baseSeed ^ 0x3C8D6E2F ^ (cellQ * 0x2B1F5A8D) ^ (cellR * 0x6E3D1F9C));
  const range = cellSize * amplitude;
  return {
    q: ((hashQ / 0xFFFFFFFF) - 0.5) * range,
    r: ((hashR / 0xFFFFFFFF) - 0.5) * range,
  };
}

/**
 * Deterministic biome index from cell grid coordinates.
 * Each cell gets one supernatural biome, evenly distributed across the map.
 */
function hashBiomeIndex(baseSeed, cellQ, cellR, count) {
  const hash = hash32(baseSeed ^ 0x9D6E1F3A ^ (cellQ * 0x4B8D7C2E) ^ (cellR * 0x3F2A5E1C));
  return Math.abs(hash) % count;
}

/**
 * Apply supernatural biome overrides via jittered-grid epicenter placement.
 *
 * Epicenter seeds are placed on a deterministic grid with per-cell jitter.
 * Each seed is assigned a supernatural biome by hash. Regions grow via
 * noise-modulated radial falloff — a pure function of (baseSeed, q, r),
 * fully chunk-local.
 *
 * Tile fields (elevationField, moisture, temperature) are modified per
 * biomeDef.fieldModifiers before terrain is reclassified with the biome's
 * terrainRules. biomeId, terrain, and 3D elevation are overwritten on match.
 * First matching epicenter wins; remaining epicenters are skipped for that tile.
 *
 * @param {Map}    tileMap   - Chunk tile map (keyed by localKey, tiles have global q,r)
 * @param {number} baseSeed  - Integer seed from stringSeed(seedText)
 * @param {number} radius    - Map radius in hexes
 */
function applySupernaturalOverrides(tileMap, baseSeed, radius) {
  if (!SUPERNATURAL_BIOMES.length) return;

  const G = EPICENTER_GRID;

  // Max epicenter radius across all supernatural biomes
  let maxEpRadius = 0;
  for (const biomeId of SUPERNATURAL_BIOMES) {
    const def = getArchetype(biomeId);
    if (def?.epicenter?.radius) {
      maxEpRadius = Math.max(maxEpRadius, def.epicenter.radius);
    }
  }
  if (!maxEpRadius) return;

  // Grid range: cells whose epicenters could affect tiles in this chunk
  const gridRange = Math.ceil(radius / G.cellSize) + Math.ceil(maxEpRadius / G.cellSize) + 1;

  // Place epicenter seeds for all cells in range
  const seeds = [];
  for (let gridR = -gridRange; gridR <= gridRange; gridR++) {
    for (let gridQ = -gridRange; gridQ <= gridRange; gridQ++) {
      const jitter = seededJitter(baseSeed, gridQ, gridR, G.cellSize, G.jitterAmplitude);
      const seedQ = Math.round(gridQ * G.cellSize + jitter.q);
      const seedR = Math.round(gridR * G.cellSize + jitter.r);

      // Seed within map bounds?
      if (distance({ q: 0, r: 0 }, { q: seedQ, r: seedR }) > radius) continue;

      const biomeIndex = hashBiomeIndex(baseSeed, gridQ, gridR, SUPERNATURAL_BIOMES.length);
      const biomeId = SUPERNATURAL_BIOMES[biomeIndex];
      const biomeDef = getArchetype(biomeId);

      if (biomeDef?.epicenter) {
        seeds.push({ q: seedQ, r: seedR, biomeId, biomeDef });
      }
    }
  }

  if (!seeds.length) return;

  // For each tile, check if within any epicenter region
  for (const [, tile] of tileMap) {
    for (const s of seeds) {
      const ep = s.biomeDef.epicenter;
      if (!ep) continue;

      const dist = distance({ q: tile.q, r: tile.r }, { q: s.q, r: s.r });

      // Noise-modulated radius for organic, irregular region boundaries
      const radiusNoise = hexFbm2D(tile.q, tile.r,
        baseSeed + hashSeedOffset(s.biomeId, 'epicenterRadius'),
        { frequency: ep.noiseScale, octaves: 2, gain: 0.5, lacunarity: 2.0 }
      );
      const effectiveRadius = ep.radius * (1.0 + (radiusNoise - 0.5) * 2 * ep.radiusNoise);

      if (dist < effectiveRadius) {
        const mods = s.biomeDef.fieldModifiers || {};
        const modElev = clamp01((tile.elevationField + (mods.elevationOffset || 0))
                                * (mods.elevationMultiplier ?? 1));
        const modMoist = clamp01(tile.moisture
                                 * (mods.moistureMultiplier ?? 1));
        const modTemp  = clamp01(tile.temperature + (mods.temperatureOffset || 0));

        tile.elevationField = modElev;
        tile.moisture      = modMoist;
        tile.temperature   = modTemp;

        tile.biomeId = s.biomeId;
        tile.terrain = classifyTerrain(modElev, modMoist, modTemp, s.biomeDef);
        tile.elevation = resolveElevation(tile.terrain, s.biomeDef);

        break;  // first matching supernatural biome wins
      }
    }
  }
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

function waterTypeForTile(seed, q, r, radius, noiseConfig, tileLookup) {
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
        : _noiseIsWater(seed, n.q, n.r, radius, noiseConfig);

      if (!isWater) continue;

      if (distance({ q: 0, r: 0 }, { q: n.q, r: n.r }) >= radius - OCEAN_EDGE_BUFFER) {
        return 'ocean';
      }

      queue.push({ q: n.q, r: n.r, depth: cur.depth + 1 });
    }
  }

  return 'lake';
}

function _noiseIsWater(seed, q, r, radius, noiseConfig) {
  const fields = sampleBaseFields(seed, q, r, noiseConfig, radius);
  const biomeDef = getArchetype('biome_default');
  const terrain = classifyTerrain(fields.elevation, fields.baseMoisture, fields.temperature, biomeDef);
  return terrain === 'water' || terrain === 'ice';
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
 * tile uses climate-driven selectBiome() — boundaries follow elevation,
 * moisture, and temperature fields, not chunk-aligned noise rolls.
 *
 * The pipeline per tile: sampleBaseFields() → selectBiome() (or biomeDef)
 * → classifyTerrain(). Tile fields include continuous elevation, moisture,
 * and temperature for downstream use (water adjustment in Phase C, slope
 * in Phase B).
 *
 * Phase C will split Pass 1 into sequential passes:
 *   sample → provisional water → adjust moisture → selectBiome → classifyTerrain,
 * so coastal/river moisture boosts affect biome selection and terrain output.
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   chunkQ    - Chunk q coordinate
 * @param {number}   chunkR    - Chunk r coordinate
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype def, or null for multi-biome
 * @param {object}   [params]  - Map parameter multipliers (unused in new pipeline)
 * @returns {{ tileMap: Map<string, object>, biomeId: string|null }}
 */
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef = null, params = {}) {
  const seed = stringSeed(seedText);

  const tileMap = new Map();

  // Collect all hex coordinates in this chunk that are within the map radius
  const candidates = hexesInChunk(chunkQ, chunkR).filter(({ q, r }) => {
    const s = -q - r;
    return Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius;
  });

  // --- Pass 1: Sample base fields, select biome, classify terrain ---
  for (const { q, r } of candidates) {
    const fields = sampleBaseFields(seed, q, r, NOISE_CONFIG, radius);

    let hexBiomeId, hexBiomeDef;
    if (biomeDef) {
      hexBiomeDef = biomeDef;
      hexBiomeId = biomeDef.id;
    } else {
      hexBiomeId = selectBiome(
        fields.elevation, fields.baseMoisture, fields.temperature,
        fields.regionBiasM, fields.regionBiasT
      );
      hexBiomeDef = getArchetype(hexBiomeId) || getArchetype('biome_default');
    }

    const terrain = classifyTerrain(
      fields.elevation, fields.baseMoisture, fields.temperature, hexBiomeDef
    );

    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null, debris: null,
      mountainType: null, waterType: null,
      elevation: resolveElevation(terrain, hexBiomeDef),
      elevationField: fields.elevation,
      moisture: fields.baseMoisture,
      temperature: fields.temperature,
      slope: 0,
      isRiver: false,
      rawLayers: fields.rawLayers,
      biomeId: hexBiomeId,
    });
  }

  // Pass 1b: Supernatural biome override (jittered-grid epicenter pass)
  if (!biomeDef) {
    applySupernaturalOverrides(tileMap, seed, radius);
  }

  // --- Pass 2: Local mountain type tagging ---
  const tileLookup = (nq, nr) => {
    const { cq, cr } = tileToChunk(nq, nr);
    if (cq === chunkQ && cr === chunkR) {
      const { lq, lr } = localCoord(chunkQ, chunkR, nq, nr);
      return tileMap.get(localKey(lq, lr)) || undefined;
    }
    // Out of chunk: deterministic via sampleBaseFields + classifyTerrain
    const fields = sampleBaseFields(seed, nq, nr, NOISE_CONFIG, radius);
    const type = classifyTerrain(
      fields.elevation, fields.baseMoisture, fields.temperature,
      getArchetype('biome_default')
    );
    if (type === 'mountain' || type === 'peak' || type === 'floatingIsland') {
      return { terrain: type, q: nq, r: nr };
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
      tile.waterType = waterTypeForTile(seed, tile.q, tile.r, radius, NOISE_CONFIG, tileLookup);
    }
  }

  // --- Pass 4: Sprinkle features (flora + resources from biome features list) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    const tileBiomeDef = biomeDef || getArchetype(tile.biomeId) || getArchetype('biome_default');
    const features = tileBiomeDef?.features || DEFAULT_FEATURES;
    const roll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_FEATURES);
    const feature = spawnFeature(roll, tile.terrain, features);
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

  // Post-classification: enforce passable-hex contiguity (multi-biome only)
  if (!biomeDef) {
    ensurePassableConnectivity(tiles, radius);
  }

  endMeasure('genTiles');
  return tiles;
}

// ---------------------------------------------------------------------------
// Post-classification: Spawn Clearance + Connectivity Enforcement
// ---------------------------------------------------------------------------

/** Terrain demotion table for forcing passability. Used by both spawn clearance
 *  and connectivity bridging. Converts impassable terrain to the most natural
 *  passable equivalent: water → marsh (ford), ice → plains (thawed),
 *  mountain → hill (pass), peak → hill (major pass),
 *  floatingIsland → hill (descends through mountain).
 */
const PASSEABLE_DEMOTION = {
  water: 'marsh',
  ice: 'plains',
  mountain: 'hill',
  peak: 'hill',
  floatingIsland: 'hill',
};

function demoteToPassable(terrain) {
  return PASSEABLE_DEMOTION[terrain] || terrain;
}

/**
 * Force passable terrain + clear features/debris around each faction spawn target.
 * Runs after all chunks are assembled, before champion placement.
 *
 * @param {object}  tiles        - Flat tile map keyed by "q,r"
 * @param {number}  radius       - Map radius in hexes
 * @param {Array<{q,r}>} targets - Spawn target coordinates (from spawnTarget())
 */
export function ensureSpawnClearance(tiles, radius, targets) {
  if (!targets || !targets.length) return;

  for (const target of targets) {
    // Clear all hexes within SPAWN_CLEARANCE_RING of the target
    for (let dq = -SPAWN_CLEARANCE_RING; dq <= SPAWN_CLEARANCE_RING; dq++) {
      for (let dr = -SPAWN_CLEARANCE_RING; dr <= SPAWN_CLEARANCE_RING; dr++) {
        const ds = -dq - dr;
        if (Math.abs(ds) > SPAWN_CLEARANCE_RING) continue;

        const q = target.q + dq;
        const r = target.r + dr;
        const key = coordKey({ q, r });
        const tile = tiles[key];
        if (!tile) continue;

        tile.terrain = demoteToPassable(tile.terrain);
        tile.feature = null;
        tile.debris = null;
      }
    }
  }
}

// Terrain-cost weights for connectivity bridging.
// Lower cost = more natural bridge point. Dijkstra minimizes total cost.
const BRIDGE_COST = {
  water: 1,
  ice: 1,
  mountain: 2,
  peak: 4,
  // floatingIsland omitted → defaults to 100 (avoid)
};

/**
 * Ensure all passable hexes form a single connected component.
 *
 * 1. Flood-fill from the center (or first passable hex) to find the main
 *    passable component.
 * 2. For any isolated passable pockets, run Dijkstra on the full hex graph
 *    (passable + impassable) to find the minimum-cost bridge to the main
 *    component. Terrain costs make the bridge follow natural saddles
 *    (mountain passes, water fords) rather than arbitrary corridors.
 * 3. Convert bridged impassable hexes via demoteToPassable, clear features.
 *
 * Runs after all chunks are assembled in generateTiles().
 *
 * @param {object} tiles  - Flat tile map keyed by "q,r"
 * @param {number} radius - Map radius in hexes
 */
export function ensurePassableConnectivity(tiles, radius) {
  const allKeys = Object.keys(tiles);
  if (allKeys.length === 0) return;

  // 1. Collect passable hex keys
  const passableSet = new Set();
  for (const key of allKeys) {
    const tile = tiles[key];
    if (tile && TERRAIN[tile.terrain]?.passable) {
      passableSet.add(key);
    }
  }
  if (passableSet.size === 0) return;

  // 2. BFS through passable hexes from the center to find the main component
  const centerKey = '0,0';
  const mainComponent = new Set();
  const seedKey = passableSet.has(centerKey) ? centerKey : passableSet.values().next().value;

  const bfsVisited = new Set();
  const queue = [seedKey];
  bfsVisited.add(seedKey);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (passableSet.has(cur)) {
      mainComponent.add(cur);
      const [cq, cr] = cur.split(',').map(Number);
      for (const nbr of neighbors({ q: cq, r: cr })) {
        const nk = coordKey(nbr);
        if (bfsVisited.has(nk)) continue;
        bfsVisited.add(nk);
        if (passableSet.has(nk)) {
          queue.push(nk);
        }
      }
    }
  }

  // All passable hexes already in the main component? Done.
  if (mainComponent.size >= passableSet.size) return;

  // 3. Find isolated passable components
  const isolated = [];
  for (const key of passableSet) {
    if (mainComponent.has(key)) continue;

    const comp = new Set();
    const q2 = [key];
    const vis2 = new Set();
    vis2.add(key);

    while (q2.length > 0) {
      const cur2 = q2.shift();
      comp.add(cur2);
      mainComponent.add(cur2);  // mark globally visited
      const [cq, cr] = cur2.split(',').map(Number);
      for (const nbr of neighbors({ q: cq, r: cr })) {
        const nk = coordKey(nbr);
        if (vis2.has(nk)) continue;
        vis2.add(nk);
        if (passableSet.has(nk) && !mainComponent.has(nk)) {
          q2.push(nk);
        }
      }
    }
    if (comp.size > 0) isolated.push(comp);
  }

  // 4. Bridge each isolated component to the main component
  for (const comp of isolated) {
    _bridgeComponent(tiles, comp, mainComponent);
  }
}

/**
 * Dijkstra-search a minimum-cost bridge from an isolated passable component
 * to the main component, then convert impassable hexes on the path.
 */
function _bridgeComponent(tiles, isolatedSet, mainSet) {
  // Pick a seed from the isolated component
  const seed = isolatedSet.values().next().value;

  const allKeys = Object.keys(tiles);
  const dist = {};
  const prev = {};
  const unvisited = new Set(allKeys);

  for (const key of allKeys) {
    dist[key] = Infinity;
    prev[key] = null;
  }
  dist[seed] = 0;

  let reachedTarget = null;

  while (unvisited.size > 0) {
    // Find minimum-distance unvisited node
    let minKey = null;
    let minDist = Infinity;
    for (const key of unvisited) {
      if (dist[key] < minDist) {
        minDist = dist[key];
        minKey = key;
      }
    }

    if (minKey === null || minDist === Infinity) break;
    unvisited.delete(minKey);

    // Reached main component?
    if (mainSet.has(minKey)) {
      reachedTarget = minKey;
      break;
    }

    // Relax neighbors
    const [cq, cr] = minKey.split(',').map(Number);
    for (const nbr of neighbors({ q: cq, r: cr })) {
      const nk = coordKey(nbr);
      if (!unvisited.has(nk) || !tiles[nk]) continue;

      const nbrTile = tiles[nk];
      const isPassable = TERRAIN[nbrTile.terrain]?.passable;
      const edgeCost = isPassable ? 0 : (BRIDGE_COST[nbrTile.terrain] ?? 100);

      const alt = dist[minKey] + edgeCost;
      if (alt < dist[nk]) {
        dist[nk] = alt;
        prev[nk] = minKey;
      }
    }
  }

  if (reachedTarget === null) return;

  // Backtrack from reached target, converting impassable hexes on the path
  let cur = reachedTarget;
  while (cur !== null && cur !== seed) {
    const tile = tiles[cur];
    if (tile && !TERRAIN[tile.terrain]?.passable) {
      tile.terrain = demoteToPassable(tile.terrain);
      tile.feature = null;
      tile.debris = null;
    }
    cur = prev[cur];
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
