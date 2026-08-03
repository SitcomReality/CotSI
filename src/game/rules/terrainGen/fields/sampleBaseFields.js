import { hexFbm2D, hexRidgedFbm2D, hexToWorld } from '../../../../engine/rules/noise.js';
import { distance } from '../../../../engine/rules/hexGrid.js';
import {
  NOISE_ELEVATION_DETAIL, NOISE_RIDGE, NOISE_MOISTURE,
  NOISE_TEMP_VARIATION, NOISE_REGION,
  SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
  SEED_REGION_M, SEED_REGION_T,
  DEFAULT_TERRAIN_RULES,
  ELEVATION_DETAIL_MIX, HYPSOMETRIC_EXPONENT,
  TEMP_BASE, TEMP_LATITUDE_WEIGHT, TEMP_VARIATION_WEIGHT, TEMP_ELEVATION_LAPSE,
} from '../../../../params/game/worldParams.js';
import { worldShape } from './worldShape.js';
import { clamp01 } from './slopeComputation.js';

// ---------------------------------------------------------------------------
// Noise config — absolute frequencies + radius-relative region bias.
//
// Detail, ridge, and moisture use absolute frequencies so a 10-hex hill
// is 10 hexes on every map size. Region bias scales with radius so larger
// maps produce more biome regions (~2.2 cycles across the map diameter).
// Temperature variation is left at its fixed frequency (local microclimate
// jitter that does not need to scale).
// ---------------------------------------------------------------------------

/**
 * Build a noise config bundle appropriate for the given map radius.
 *
 * Elevation detail uses an absolute frequency so a 10-hex hill is 10 hexes
 * on every map size. Ridge, moisture, and region bias scale with radius so
 * that small maps get proportionate feature diversity — without this,
 * at r=21 ridge and moisture complete <1 cycle, producing near-constant
 * fields that suppress mountains and inflate desert coverage.
 *
 * REF_RADIUS = 35: ridge's absolute frequency (0.04) was calibrated for
 * r=35. At r=21 the REF_RADIUS/radius scaling gives ~1.7× higher frequency,
 * yielding ~2.5 half-cycles instead of the current 0.5.
 *
 * Moisture uses a direct k/radius formula (k=1.68) because its base
 * frequency (0.02) is too low for REF_RADIUS/radius to produce enough
 * variation on small maps — at r=21, 0.02 * 35/21 = 0.033 still gives
 * only 0.5 half-cycles. 1.68/21 = 0.080 gives ~2-3 half-cycles.
 *
 * @param {number} radius - Map radius in hexes
 * @returns {{ ELEVATION_DETAIL, RIDGE, MOISTURE, TEMP_VARIATION, REGION,
 *             SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
 *             SEED_REGION_M, SEED_REGION_T }}
 */
export function getNoiseConfig(radius) {
  const REF_RADIUS = 35;
  return {
    ELEVATION_DETAIL: NOISE_ELEVATION_DETAIL,
    RIDGE:            { ...NOISE_RIDGE,   frequency: NOISE_RIDGE.frequency   * (REF_RADIUS / radius) },
    MOISTURE:         { ...NOISE_MOISTURE, frequency: 1.68 / radius },
    TEMP_VARIATION:   NOISE_TEMP_VARIATION,
    REGION:           { ...NOISE_REGION, frequency: 1.1 / radius },
    SEED_DETAIL,
    SEED_RIDGE,
    SEED_MOISTURE,
    SEED_TEMP,
    SEED_REGION_M,
    SEED_REGION_T,
  };
}

/** r=21 config (the reference radius for Phase G frequency targets). */
export const NOISE_CONFIG = getNoiseConfig(21);

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
  const ridges    = hexRidgedFbm2D(q, r, baseSeed + NC.SEED_RIDGE,  NC.RIDGE);
  const dist      = distance({ q, r }, { q: 0, r: 0 });
  const rawElev   = worldShape(dist, radius) * (detail * ELEVATION_DETAIL_MIX + ridges * ELEVATION_DETAIL_MIX);
  // Hypsometric curve spreads the low-mid elevation range so the terrain
  // classifier has room to distinguish plains, hills, mountains, and peaks.
  const elevation = Math.pow(rawElev, HYPSOMETRIC_EXPONENT);

  // Moisture: raw FBM, no water adjustment yet (Phase C)
  const baseMoisture = hexFbm2D(q, r, baseSeed + NC.SEED_MOISTURE, NC.MOISTURE);

  // Temperature: world-space Y latitude + lapse rate + local variation
  const { y } = hexToWorld(q, r);
  const worldRadiusY  = radius * 1.7320508;
  const latitudeTerm  = 1.0 - (Math.abs(y) / worldRadiusY);
  const tempVariation = hexFbm2D(q, r, baseSeed + NC.SEED_TEMP, NC.TEMP_VARIATION);
  const RULES = DEFAULT_TERRAIN_RULES;
  // Widen the latitude gradient (0.55→0.80) so the map centre is warmer
  // and the map edge is colder, giving cold biomes room to appear.
  // Increase the elevation lapse rate (0.30→0.40) so high peaks get colder
  // regardless of latitude, creating cold high-elevation microclimates.
  const temperature = clamp01(
    TEMP_BASE + TEMP_LATITUDE_WEIGHT * (latitudeTerm - 0.5)
        + TEMP_VARIATION_WEIGHT * (tempVariation - 0.5)
        - TEMP_ELEVATION_LAPSE * (elevation - RULES.waterMaxElevation)
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
