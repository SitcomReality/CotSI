import { hexFbm2D, hexToWorld } from '../../../../engine/rules/noise.js';
import { distance } from '../../../../engine/rules/hexGrid.js';
import {
  NOISE_ELEVATION_DETAIL, NOISE_RIDGE, NOISE_MOISTURE,
  NOISE_TEMP_VARIATION, NOISE_REGION,
  SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
  SEED_REGION_M, SEED_REGION_T,
  DEFAULT_TERRAIN_RULES,
} from '../../../../params/game/worldParams.js';
import { worldShape } from './worldShape.js';
import { clamp01 } from './slopeComputation.js';

// ---------------------------------------------------------------------------
// Noise config bundle (shared by sampleBaseFields, generateChunkTiles, etc.)
// ---------------------------------------------------------------------------

export const NOISE_CONFIG = {
  ELEVATION_DETAIL: NOISE_ELEVATION_DETAIL,
  RIDGE: NOISE_RIDGE,
  MOISTURE: NOISE_MOISTURE,
  TEMP_VARIATION: NOISE_TEMP_VARIATION,
  REGION: NOISE_REGION,
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
};

/**
 * Sample base physical fields at a global hex coordinate.
 *
 * Phase B elevation: 2-layer additive composite shaped by worldShape.
 * detail + ridges sum to approximately [0, 2], so divide by 2 for [0, 1],
 * then multiply by worldShape for the macro elevation envelope.
 *
 * @param {number} baseSeed    - Integer seed from stringSeed(seedText)
 * @param {number} q           - Global hex q coordinate
 * @param {number} r           - Global hex r coordinate
 * @param {object} noiseConfig - { ELEVATION_DETAIL, RIDGE, MOISTURE, TEMP_VARIATION, REGION,
 *                                SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
 *                                SEED_REGION_M, SEED_REGION_T }
 * @param {number} radius      - Map radius in hexes
 * @returns {{ elevation, rawLayers, baseMoisture, temperature, regionBiasM, regionBiasT }}
 */
export function sampleBaseFields(baseSeed, q, r, noiseConfig, radius) {
  const NC = noiseConfig;

  // Additive elevation composite shaped by worldShape
  const detail    = hexFbm2D(q, r, baseSeed + NC.SEED_DETAIL, NC.ELEVATION_DETAIL);
  const ridges    = hexFbm2D(q, r, baseSeed + NC.SEED_RIDGE,  NC.RIDGE);
  const dist      = distance({ q, r }, { q: 0, r: 0 });
  const rawElev   = worldShape(dist, radius) * (detail * 0.50 + ridges * 0.50);
  const elevation = clamp01(rawElev);

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
