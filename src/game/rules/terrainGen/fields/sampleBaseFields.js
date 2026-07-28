import { hexFbm2D, hexRidgedFbm2D, hexToWorld } from '../../../../engine/rules/noise.js';
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
// Frequency table — Phase G target frequencies by map radius.
// Values from dev/mapgen_update/phaseG_tuning_polish.md §4.1.
// r=100 values extrapolated.
// ---------------------------------------------------------------------------

const FREQ_TABLE = {
  ELEVATION_DETAIL: [
    { r: 7,  f: 0.030 },
    { r: 21, f: 0.020 },
    { r: 50, f: 0.012 },
    { r: 100, f: 0.008 },
  ],
  RIDGE: [
    { r: 7,  f: 0.015 },
    { r: 21, f: 0.008 },
    { r: 50, f: 0.005 },
    { r: 100, f: 0.003 },
  ],
  MOISTURE: [
    { r: 7,  f: 0.010 },
    { r: 21, f: 0.006 },
    { r: 50, f: 0.004 },
    { r: 100, f: 0.003 },
  ],
  REGION: [
    { r: 7,  f: 0.0040 },
    { r: 21, f: 0.0015 },
    { r: 50, f: 0.0008 },
    { r: 100, f: 0.0005 },
  ],
};

/**
 * Look up the frequency for a noise field at a given map radius.
 * Interpolates between the explicit radii in FREQ_TABLE; clamps
 * to the nearest entry for radii outside the table range.
 *
 * @param {string} fieldKey - One of 'ELEVATION_DETAIL', 'RIDGE', 'MOISTURE', 'REGION'
 * @param {number} radius   - Map radius in hexes
 * @returns {number} interpolated frequency
 */
function freqAtRadius(fieldKey, radius) {
  const table = FREQ_TABLE[fieldKey];
  if (!table) return null;
  if (radius <= table[0].r) return table[0].f;
  if (radius >= table[table.length - 1].r) return table[table.length - 1].f;
  for (let i = 0; i < table.length - 1; i++) {
    if (radius >= table[i].r && radius < table[i + 1].r) {
      const t = (radius - table[i].r) / (table[i + 1].r - table[i].r);
      return table[i].f + t * (table[i + 1].f - table[i].f);
    }
  }
  return table[table.length - 1].f;
}

/**
 * Build a noise config bundle appropriate for the given map radius.
 * Temperature variation is left at its r=21 frequency since it's local
 * microclimate jitter that does not need to scale with map size.
 *
 * @param {number} radius - Map radius in hexes
 * @returns {{ ELEVATION_DETAIL, RIDGE, MOISTURE, TEMP_VARIATION, REGION,
 *             SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
 *             SEED_REGION_M, SEED_REGION_T }}
 */
export function getNoiseConfig(radius) {
  return {
    ELEVATION_DETAIL: { ...NOISE_ELEVATION_DETAIL, frequency: freqAtRadius('ELEVATION_DETAIL', radius) },
    RIDGE:            { ...NOISE_RIDGE,            frequency: freqAtRadius('RIDGE', radius) },
    MOISTURE:         { ...NOISE_MOISTURE,         frequency: freqAtRadius('MOISTURE', radius) },
    TEMP_VARIATION:   NOISE_TEMP_VARIATION,
    REGION:           { ...NOISE_REGION,           frequency: freqAtRadius('REGION', radius) },
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
