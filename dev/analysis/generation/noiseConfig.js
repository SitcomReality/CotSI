/**
 * noiseConfig.js — Noise configuration for Phase 0 calibration and batch analysis.
 *
 * Detail, ridge, and moisture use absolute frequencies so a 10-hex hill
 * is 10 hexes on every map size. Region bias scales with radius so larger
 * maps produce more biome regions (~2.2 cycles across the map diameter).
 * Temperature variation is left at its fixed frequency (local microclimate
 * jitter that does not need to scale).
 */

// ── Base noise configs (absolute frequencies) ────────────────────────

const BASE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.10,
};
const BASE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.04, offset: 0.9,
};
const BASE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.02,
};
const BASE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08,
};
const BASE_REGION = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.003,
};

export const SEED_DETAIL      = 0x7B2C1E8D;
export const SEED_RIDGE       = 0x3F5A9B2C;
export const SEED_MOISTURE    = 0x8C6E4F1A;
export const SEED_TEMP        = 0x2D7B8E3F;
export const SEED_REGION_M    = 0x5A1C9D6E;
export const SEED_REGION_T    = 0x9F3E7B4A;
export const SEED_FEATURES    = 0x1E4A7C9D;
export const SEED_DEBRIS      = 0xD8F3A5B1;
export const SEED_DEBRIS_KIND = 0x4C7E2F9A;

export const EPICENTER_GRID = {
  cellSize: 45,
  jitterAmplitude: 0.40,
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
    ELEVATION_DETAIL: BASE_ELEVATION_DETAIL,
    RIDGE:            BASE_RIDGE,
    MOISTURE:         BASE_MOISTURE,
    TEMP_VARIATION:   BASE_TEMP_VARIATION,
    REGION:           { ...BASE_REGION, frequency: 1.1 / radius },
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
