import { makeRng, stringSeed } from '../../../../engine/rules/seededRng.js';
import { hexFbm2D } from '../../../../engine/rules/noise.js';
import { coordKey, distance } from '../../../../engine/rules/hexGrid.js';
import { EPICENTER_CONFIG } from '../../../../params/game/worldParams.js';
import { getArchetype } from '../../archetypes.js';
import { classifyTerrain } from '../classification/terrainClassification.js';
import { resolveElevation } from '../classification/terrainClassification.js';
import { clamp01 } from '../fields/slopeComputation.js';
import { SUPERNATURAL_BIOMES } from '../classification/biomeSelection.js';

/**
 * Generate epicenter seed positions via seeded dart-throwing.
 *
 * Places N seed points randomly on a hex-shaped map of the given radius,
 * enforcing a minimum distance between them for organic-but-spread
 * placement. N scales with map area via EPICENTER_CONFIG.density.
 *
 * Biome assignment uses low-frequency FBM noise for natural regional
 * clustering — brass_grave and unfinished_lands form broad contiguous
 * patches rather than a perfectly random scatter.
 *
 * Fully deterministic for a given (baseSeed, radius) pair.
 *
 * @param {number} baseSeed - Integer seed from stringSeed(seedText)
 * @param {number} radius   - Map radius in hexes
 * @returns {{ q: number, r: number, biomeId: string, biomeDef: object }[]}
 */
function generateSupernaturalSeeds(baseSeed, radius) {
  const area = 3 * Math.sqrt(3) / 2 * radius * radius;
  const targetCount = Math.min(
    EPICENTER_CONFIG.maxEpicenters,
    Math.max(1, Math.floor(area * EPICENTER_CONFIG.density))
  );
  const minDist = Math.max(EPICENTER_CONFIG.minAbsDist, radius * EPICENTER_CONFIG.minDistFraction);

  const rng = makeRng('supernatural_' + baseSeed);
  const seeds = [];
  const maxAttempts = targetCount * EPICENTER_CONFIG.maxAttemptsPerTarget;

  const biomeNoiseSeed = baseSeed + 0x9D6E1F3A;
  const biomeNoiseOpts = { frequency: EPICENTER_CONFIG.noiseFrequency, octaves: 2, gain: 0.5, lacunarity: 2.0 };

  for (let attempts = 0; seeds.length < targetCount && attempts < maxAttempts; attempts++) {
    // Rejection-sample a valid hex coordinate within the map
    const q = Math.floor(rng() * (2 * radius + 1)) - radius;
    const r = Math.floor(rng() * (2 * radius + 1)) - radius;
    if (Math.abs(-q - r) > radius) continue;

    // Enforce minimum distance from existing seeds
    let tooClose = false;
    for (const existing of seeds) {
      if (distance({ q, r }, { q: existing.q, r: existing.r }) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // Assign biome via low-frequency FBM for natural regional clustering
    const noiseVal = hexFbm2D(q, r, biomeNoiseSeed, biomeNoiseOpts);
    const biomeIndex = Math.floor(noiseVal * SUPERNATURAL_BIOMES.length);
    const biomeId = SUPERNATURAL_BIOMES[Math.min(biomeIndex, SUPERNATURAL_BIOMES.length - 1)];
    const biomeDef = getArchetype(biomeId);

    if (biomeDef?.epicenter) {
      seeds.push({ q, r, biomeId, biomeDef });
    }
  }

  return seeds;
}

/**
 * Deterministic integer offset from a biome ID + tag pair.
 * Used to derive independent noise seeds per biome per purpose.
 */
function hashSeedOffset(biomeId, tag) {
  return stringSeed(biomeId + ':' + tag);
}

/**
 * Base epicenter radius, scaled to map size.
 * Prefers the per-biome radiusFraction; falls back to the legacy absolute
 * `ep.radius` (a scaling bug in early defs) with a one-time warning.
 */
let warnedLegacyEpicenterRadius = false;
function epicenterBaseRadius(ep, radius) {
  if (ep.radiusFraction !== undefined) {
    return ep.radiusFraction * radius;
  }
  if (!warnedLegacyEpicenterRadius) {
    warnedLegacyEpicenterRadius = true;
    console.warn('[epicenterPlacement] epicenter missing radiusFraction — falling back to legacy ep.radius');
  }
  return ep.radius;
}

/**
 * Apply supernatural biome overrides via dart-thrown epicenter placement.
 *
 * Epicenter seeds are placed by seeded dart-throwing for organic distribution
 * with no grid alignment. Each seed is assigned a supernatural biome by
 * low-frequency noise. Regions grow via noise-modulated radial falloff —
 * a pure function of (baseSeed, q, r), fully deterministic.
 *
 * Radius scales with map radius via each biome's epicenter.radiusFraction,
 * so supernatural regions are proportional to the map at all scales.
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

  const seeds = generateSupernaturalSeeds(baseSeed, radius);
  if (!seeds.length) return;

  // O(1) beach lookup: index the chunk's tiles by global coordKey once, kept
  // in sync as tiles are reclassified below (mirrors the previous live-value
  // scan of tileMap). Known limitation: only this chunk's core tiles are
  // indexed, so an epicenter near a chunk seam can classify a beach differently
  // than the neighboring chunk would (chunk-seam-inconsistent beach). Cross-chunk
  // terrain lookup needs neighbor-chunk data at classification time — deferred.
  const terrainByKey = new Map();
  for (const [, t] of tileMap) {
    terrainByKey.set(coordKey({ q: t.q, r: t.r }), t.terrain);
  }

  // For each tile, check if within any epicenter region
  for (const [, tile] of tileMap) {
    for (const s of seeds) {
      const ep = s.biomeDef.epicenter;
      if (!ep) continue;

      const dist = distance({ q: tile.q, r: tile.r }, { q: s.q, r: s.r });

      // Base radius scales with map size via radiusFraction
      const baseRadius = epicenterBaseRadius(ep, radius);

      // Noise-modulated radius for organic, irregular region boundaries
      const radiusNoise = hexFbm2D(tile.q, tile.r,
        baseSeed + hashSeedOffset(s.biomeId, 'epicenterRadius'),
        { frequency: ep.noiseScale, octaves: 2, gain: 0.5, lacunarity: 2.0 }
      );
      const effectiveRadius = baseRadius * (1.0 + (radiusNoise - 0.5) * 2 * ep.radiusNoise);

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
        tile.terrain = classifyTerrain(modElev, modMoist, modTemp, tile.slope, s.biomeDef,
          tile.q, tile.r, (nq, nr) => {
            const terrain = terrainByKey.get(coordKey({ q: nq, r: nr }));
            return terrain === 'water' || terrain === 'ice';
          }
        );
        terrainByKey.set(coordKey({ q: tile.q, r: tile.r }), tile.terrain);
        tile.elevation = resolveElevation(tile.terrain, s.biomeDef);

        break;  // first matching supernatural biome wins
      }
    }
  }
}
