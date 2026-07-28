/**
 * noiseConfig.js — Noise configuration for Phase 0 calibration and batch analysis.
 *
 * Matches the target pipeline from overview.md §6 and Phase G §4.1 for
 * map-size-dependent frequency tuning. This file is the single source of
 * truth for calibration noise parameters — sampleBaseFields,
 * frequencyVerification, and the calibration UI all import from here.
 *
 * Phase G introduced radius-dependent frequencies so that small maps
 * (r=7) and large maps (r=50, r=100) get appropriate noise scales rather
 * than a one-size-fits-all set tuned for r=21.
 */

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

// ── Base noise configs (r=21 frequencies) ────────────────────────────

const BASE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,
};
const BASE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008, offset: 0.9,
};
const BASE_MOISTURE = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006,
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
    ELEVATION_DETAIL: { ...BASE_ELEVATION_DETAIL, frequency: freqAtRadius('ELEVATION_DETAIL', radius) },
    RIDGE:            { ...BASE_RIDGE,            frequency: freqAtRadius('RIDGE', radius) },
    MOISTURE:         { ...BASE_MOISTURE,         frequency: freqAtRadius('MOISTURE', radius) },
    TEMP_VARIATION:   BASE_TEMP_VARIATION,
    REGION:           { ...BASE_REGION,           frequency: freqAtRadius('REGION', radius) },
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
