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
  EPICENTER_GRID,
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
  SEED_FEATURES,
  SEED_DEBRIS,
  SEED_DEBRIS_KIND,
} from '../../../src/params/game/worldParams.js';

// Re-export seed offsets for consumers that import from noiseConfig.js
export {
  SEED_DETAIL,
  SEED_RIDGE,
  SEED_MOISTURE,
  SEED_TEMP,
  SEED_REGION_M,
  SEED_REGION_T,
  SEED_FEATURES,
  SEED_DEBRIS,
  SEED_DEBRIS_KIND,
  EPICENTER_GRID,
};

export const SEED_EPICENTER_HASH = 0xB8A4F2C6;

// ── Seed fields list for iteration ───────────────────────────────────

export const SEED_FIELDS = [
  'SEED_DETAIL', 'SEED_RIDGE', 'SEED_MOISTURE',
  'SEED_TEMP', 'SEED_REGION_M', 'SEED_REGION_T',
  'SEED_FEATURES', 'SEED_DEBRIS', 'SEED_DEBRIS_KIND',
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
 * Detail, ridge, and moisture use absolute frequencies (same physical
 * scale at all radii). Region bias scales with radius.
 * Temperature variation is left at its fixed frequency.
 *
 * @param {number} radius - Map radius in hexes
 * @returns {{ ELEVATION_DETAIL, RIDGE, MOISTURE, TEMP_VARIATION, REGION,
 *             SEED_DETAIL, SEED_RIDGE, SEED_MOISTURE, SEED_TEMP,
 *             SEED_REGION_M, SEED_REGION_T }}
 */
export function getNoiseConfig(radius) {
  return {
    ELEVATION_DETAIL: NOISE_ELEVATION_DETAIL,
    RIDGE:            NOISE_RIDGE,
    MOISTURE:         NOISE_MOISTURE,
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
