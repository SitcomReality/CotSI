/**
 * noiseConfig.js — Noise configuration for Phase 0 calibration and batch analysis.
 *
 * Detail, ridge, and moisture use absolute frequencies so a 10-hex hill
 * is 10 hexes on every map size. Region bias scales with radius so larger
 * maps produce more biome regions (~2.2 cycles across the map diameter).
 * Temperature variation is left at its fixed frequency (local microclimate
 * jitter that does not need to scale).
 *
 * Base noise configs and seed offsets are imported from the in-game parameter
 * source (src/params/game/worldParams.js) so the analysis tool stays in sync
 * with the game engine.
 */
import {
  NOISE_ELEVATION_DETAIL,
  NOISE_RIDGE,
  NOISE_MOISTURE,
  NOISE_TEMP_VARIATION,
  NOISE_REGION,
  EPICENTER_CONFIG,
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
  SEED_FEATURES,
} from '../../../../src/params/game/terrainGenParams.js';

// Re-export seed offsets for consumers that import from noiseConfig.js
export {
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
  SEED_FEATURES,
  EPICENTER_CONFIG,
};

export const SEED_EPICENTER_HASH = 0xB8A4F2C6;

// ── Seed fields list for iteration ───────────────────────────────────

export const SEED_FIELDS = [
  'SEED_DETAIL', 'SEED_RIDGE', 'SEED_MOISTURE',
  'SEED_TEMP', 'SEED_REGION_M', 'SEED_REGION_T',
  'SEED_FEATURES',
];

export const NOISE_FIELDS = [
  { key: 'ELEVATION_DETAIL', label: 'Elevation detail' },
  { key: 'RIDGE', label: 'Ridge noise' },
  { key: 'MOISTURE', label: 'Moisture' },
  { key: 'TEMP_VARIATION', label: 'Temperature variation' },
  { key: 'REGION', label: 'Region bias' },
];

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

/** r=21 config (default for backward compatibility). */
export const NOISE_CONFIG = getNoiseConfig(21);
