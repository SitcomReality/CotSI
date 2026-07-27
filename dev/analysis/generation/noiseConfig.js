/**
 * noiseConfig.js — Provisional noise configuration for Phase 0 calibration.
 *
 * Matches the target pipeline from overview.md §6. All frequency values
 * are marked TBD pending frequency verification. This file is the single
 * authority for calibration noise parameters — both sampleBaseFields and
 * the calibration UI import from here.
 *
 * In Phase A, these constants move to src/params/game/worldParams.js.
 * For now they live here so calibration runs against the target pipeline
 * without requiring game code changes.
 */

export const NOISE_CONFIG = {

  // ── Elevation layers ──────────────────────────────────────────────
  CONTINENT: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0008,   // TBD
  },
  ELEVATION_DETAIL: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,    // TBD
  },
  RIDGE: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008,    // TBD
  },

  // ── Climate fields ────────────────────────────────────────────────
  MOISTURE: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006,     // TBD
  },
  TEMP_VARIATION: {
    octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08,      // TBD
  },
  REGION: {
    octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.0015,    // TBD
  },

  // ── Epicenter grid (not used in Phase 0, documented for future) ───
  EPICENTER_GRID: {
    cellSize: 45,
    jitterAmplitude: 0.40,
  },

  // ── Feature channels ──────────────────────────────────────────────
  FEATURES: {
    octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.3,
  },
  DEBRIS: {
    octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.5,
  },

  // ── Seed offsets (overview §6, §7.1) ──────────────────────────────
  SEED_CONTINENT:   0x4E9D3A7F,
  SEED_DETAIL:      0x7B2C1E8D,
  SEED_RIDGE:       0x3F5A9B2C,
  SEED_MOISTURE:    0x8C6E4F1A,
  SEED_TEMP:        0x2D7B8E3F,
  SEED_REGION_M:    0x5A1C9D6E,
  SEED_REGION_T:    0x9F3E7B4A,
  SEED_FEATURES:    0x1E4A7C9D,
  SEED_DEBRIS:      0xD8F3A5B1,
  SEED_DEBRIS_KIND: 0x4C7E2F9A,

  // Epicenter grid seed offset (used in Phase A, from overview §7.1)
  SEED_EPICENTER_HASH: 0xB8A4F2C6,
};

/**
 * Convenience: list of seed fields for iteration.
 */
export const SEED_FIELDS = [
  'SEED_CONTINENT', 'SEED_DETAIL', 'SEED_RIDGE', 'SEED_MOISTURE',
  'SEED_TEMP', 'SEED_REGION_M', 'SEED_REGION_T',
  'SEED_FEATURES', 'SEED_DEBRIS', 'SEED_DEBRIS_KIND',
];

/**
 * Convenience: list of noise field names for iteration.
 */
export const NOISE_FIELDS = [
  { key: 'CONTINENT', label: 'Continent mask' },
  { key: 'ELEVATION_DETAIL', label: 'Elevation detail' },
  { key: 'RIDGE', label: 'Ridge noise' },
  { key: 'MOISTURE', label: 'Moisture' },
  { key: 'TEMP_VARIATION', label: 'Temperature variation' },
  { key: 'REGION', label: 'Region bias' },
];
