import { stringSeed, seededNoise } from '../../../engine/rules/seededRng.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN, DEFAULT_FEATURES } from '../terrainTypes.js';
import { tileToChunk, localCoord, localKey, hexesInChunk } from '../../../engine/rules/chunkGrid.js';
import { CHUNK_SIZE } from '../../../params/engine/chunkParams.js';
import {
  MAX_LOOKUP_RADIUS, DEFAULT_TERRAIN_RULES, SEA_LEVEL_ELEVATION,
  NOISE_CHANNEL_FEATURES,
} from '../../../params/game/worldParams.js';
import { getArchetype } from '../archetypes.js';
import { getNoiseConfig, sampleBaseFields } from './fields/sampleBaseFields.js';
import { computeSlope, clamp01 } from './fields/slopeComputation.js';
import { isProvisionalWater, provisionalTerrainForRing } from './classification/provisionalWater.js';
import { adjustMoisture, computeRainShadow } from './classification/moistureAdjustment.js';
import { selectBiome } from './classification/biomeSelection.js';
import { classifyTerrain, resolveElevation } from './classification/terrainClassification.js';
import { applySupernaturalOverrides } from './placement/epicenterPlacement.js';
import { tagMountainType } from './tagging/mountainTagging.js';
import { waterTypeForTile } from './tagging/waterTagging.js';
import { featureDensity, canSpawnFruitTree } from './features/featureDensity.js';
import { spawnFeature } from './features/featureSpawning.js';

/**
 * Generate all global (q, r) coordinates within a chunk expanded by ringWidth.
 *
 * @param {number} cq        - Chunk q coordinate
 * @param {number} cr        - Chunk r coordinate
 * @param {number} ringWidth - Number of extra hex layers around the chunk
 * @returns {{ q: number, r: number }[]}
 */
export function hexesInExpandedChunk(cq, cr, ringWidth) {
  const half = CHUNK_SIZE / 2;
  const baseQ = cq * CHUNK_SIZE;
  const baseR = cr * CHUNK_SIZE;
  const results = [];
  for (let lq = -half - ringWidth; lq < half + ringWidth; lq++) {
    for (let lr = -half - ringWidth; lr < half + ringWidth; lr++) {
      results.push({ q: baseQ + lq, r: baseR + lr });
    }
  }
  return results;
}

/**
 * Generate tiles for a single chunk.
 *
 * Pipeline:
 *   1. Sample base fields for all hexes (core + border ring)
 *   2. Classify provisional water
 *   3. Adjust moisture (coastal boost)
 *   4. Compute slope for core hexes
 *   5. Classify terrain with adjusted moisture + slope
 *   6. Apply supernatural overrides (multi-biome only)
 *   7. Mountain type tagging
 *   8. Water type tagging
 *   9. Sprinkle features (density-modulated + fruit tree climate gate)
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   chunkQ    - Chunk q coordinate
 * @param {number}   chunkR    - Chunk r coordinate
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype def, or null for multi-biome
 * @returns {{ tileMap: Map<string, object>, biomeId: string|null }}
 */
export function generateChunkTiles(seedText, chunkQ, chunkR, radius, biomeDef = null) {
  const seed = stringSeed(seedText);
  const tileMap = new Map();

  // --- Pass 0: Sample base fields for all hexes (core + border ring) ---
  const allHexes = hexesInExpandedChunk(chunkQ, chunkR, MAX_LOOKUP_RADIUS);
  const fieldMap = new Map();
  const noiseConfig = getNoiseConfig(radius);
  for (const { q, r } of allHexes) {
    fieldMap.set(coordKey({ q, r }), sampleBaseFields(seed, q, r, noiseConfig, radius));
  }

  // Determine which hexes are in the core chunk and within the map radius
  const coreSet = new Set();
  const coreHexes = hexesInChunk(chunkQ, chunkR);
  for (const { q, r } of coreHexes) {
    const s = -q - r;
    if (Math.abs(s) <= radius && Math.abs(q) <= radius && Math.abs(r) <= radius) {
      coreSet.add(coordKey({ q, r }));
    }
  }

  // --- Pass 1: Classify provisional water (all hexes: core + border ring) ---
  const provisionalWaterSet = new Set();
  for (const [key, fields] of fieldMap) {
    if (isProvisionalWater(fields.elevation, fields.baseMoisture, DEFAULT_TERRAIN_RULES)) {
      provisionalWaterSet.add(key);
    }
  }

  // --- Pass 2: Adjust moisture (core hexes, boosted by nearby water, dried by rain shadow) ---
  // Missing border-ring entries are expected — default to sea level (0), which
  // is never high enough upwind to cast a shadow.
  const elevationAt = (nq, nr) => fieldMap.get(coordKey({ q: nq, r: nr }))?.elevation ?? SEA_LEVEL_ELEVATION;
  const adjustedMoistureMap = new Map();
  for (const key of coreSet) {
    const [q, r] = key.split(',').map(Number);
    const fields = fieldMap.get(key);
    const coastal = adjustMoisture(q, r, fields.baseMoisture, fieldMap, provisionalWaterSet);
    adjustedMoistureMap.set(key, clamp01(coastal - computeRainShadow(q, r, elevationAt)));
  }

  // --- Pass 3: Compute slope for core hexes ---
  const slopeMap = new Map();
  for (const key of coreSet) {
    const [q, r] = key.split(',').map(Number);
    slopeMap.set(key, computeSlope(q, r, elevationAt));
  }

  // --- Pass 4: Classify terrain for core hexes (with adjusted moisture) ---
  for (const key of coreSet) {
    const [q, r] = key.split(',').map(Number);
    const fields = fieldMap.get(key);
    const slope = slopeMap.get(key);
    const moisture = adjustedMoistureMap.get(key);

    let hexBiomeId, hexBiomeDef;
    if (biomeDef) {
      hexBiomeDef = biomeDef;
      hexBiomeId = biomeDef.id;
    } else {
      hexBiomeId = selectBiome(
        fields.elevation, moisture, fields.temperature,
        fields.regionBiasM, fields.regionBiasT
      );
      hexBiomeDef = getArchetype(hexBiomeId) || getArchetype('biome_default');
    }

    const terrain = classifyTerrain(
      fields.elevation, moisture, fields.temperature, slope, hexBiomeDef,
      q, r, (nq, nr) => provisionalWaterSet.has(coordKey({ q: nq, r: nr }))
    );

    const { lq, lr } = localCoord(chunkQ, chunkR, q, r);
    tileMap.set(localKey(lq, lr), {
      q, r, terrain, feature: null,
      mountainType: null, waterType: null,
      elevation: resolveElevation(terrain, hexBiomeDef),
      elevationField: fields.elevation,
      baseMoisture: fields.baseMoisture,
      moisture,
      temperature: fields.temperature,
      slope,
      isRiver: false,
      rawLayers: fields.rawLayers,
      biomeId: hexBiomeId,
    });
  }

  // Pass 5b: Supernatural biome override (jittered-grid epicenter pass)
  if (!biomeDef) {
    applySupernaturalOverrides(tileMap, seed, radius);
  }

  // --- Pass 6: Local mountain type tagging ---
  const tileLookup = (nq, nr) => {
    const { cq, cr } = tileToChunk(nq, nr);
    if (cq === chunkQ && cr === chunkR) {
      const { lq, lr } = localCoord(chunkQ, chunkR, nq, nr);
      const t = tileMap.get(localKey(lq, lr));
      if (t) {
        return { terrain: t.terrain, q: nq, r: nr };
      }
      return undefined;
    }
    // Out of chunk: check border-ring fieldMap
    const prov = provisionalTerrainForRing(nq, nr, fieldMap);
    if (prov === 'mountain') {
      return { terrain: 'mountain', q: nq, r: nr };
    }
    if (prov === 'water') {
      return { terrain: 'water', q: nq, r: nr };
    }
    return undefined;
  };

  for (const [, tile] of tileMap) {
    if (tile.terrain === 'mountain' || tile.terrain === 'peak') {
      tagMountainType(tile, tileLookup);
    }
  }

  // --- Pass 7: Local water type tagging ---
  for (const [, tile] of tileMap) {
    if (tile.terrain === 'water') {
      tile.waterType = waterTypeForTile(tile.q, tile.r, radius, fieldMap, tileLookup);
    }
  }

  // --- Pass 8: Sprinkle features (flora + resources, density-modulated) ---
  for (const [, tile] of tileMap) {
    if (!TERRAIN[tile.terrain].passable) continue;
    const tileBiomeDef = biomeDef || getArchetype(tile.biomeId) || getArchetype('biome_default');
    const features = tileBiomeDef?.features || DEFAULT_FEATURES;
    const treeLineMax = tileBiomeDef?.terrainRules?.treeLineMax ?? DEFAULT_TERRAIN_RULES.treeLineMax;
    const density = featureDensity(
      tile.terrain, tile.elevationField, tile.moisture, tile.slope, treeLineMax
    );
    const roll = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_FEATURES);
    let feature = spawnFeature(roll, tile.terrain, density, features);

    // Fruit tree climate gate: if conditions aren't suitable, fall through to
    // the remaining feature rules with the same roll (keeps determinism) so a
    // lower-priority rule can still win on this tile.
    if (feature && feature.kind === 'fruitTree') {
      if (!canSpawnFruitTree(tile.elevationField, tile.moisture, treeLineMax)) {
        feature = spawnFeature(
          roll, tile.terrain, density,
          features.filter((rule) => rule.kind !== 'fruitTree')
        );
      }
    }

    if (feature) {
      tile.feature = feature;
    }
  }

  return { tileMap, biomeId: biomeDef?.id || null };
}
