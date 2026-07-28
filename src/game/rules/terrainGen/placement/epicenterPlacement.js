import { hash32, stringSeed } from '../../../../engine/rules/seededRng.js';
import { hexFbm2D } from '../../../../engine/rules/noise.js';
import { coordKey, distance } from '../../../../engine/rules/hexGrid.js';
import { EPICENTER_GRID } from '../../../../params/game/worldParams.js';
import { getArchetype } from '../../archetypes.js';
import { classifyTerrain } from '../classification/terrainClassification.js';
import { resolveElevation } from '../classification/terrainClassification.js';
import { clamp01 } from '../fields/slopeComputation.js';
import { SUPERNATURAL_BIOMES } from '../classification/biomeSelection.js';

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
export function applySupernaturalOverrides(tileMap, baseSeed, radius) {
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
        tile.terrain = classifyTerrain(modElev, modMoist, modTemp, tile.slope, s.biomeDef);
        tile.elevation = resolveElevation(tile.terrain, s.biomeDef);

        break;  // first matching supernatural biome wins
      }
    }
  }
}
