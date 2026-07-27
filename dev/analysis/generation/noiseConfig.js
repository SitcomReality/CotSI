/**
 * noiseConfig.js — Noise configuration for Phase 0 calibration.
 *
 * Matches the target pipeline from overview.md §6. This file is the single
 * source of truth for calibration noise parameters — sampleBaseFields,
 * frequencyVerification, and the calibration UI all import from here.
 *
 * Frequencies are FIRST-PASS CALIBRATED from zero-crossing analysis across
 * 2 seeds × r=50 (see update_progress/phase0_step1_calibration_1.md).
 * The earlier TBD values produced effective wavelengths 10-50× shorter than
 * targets. These corrected values divide each frequency by the ratio of
 * empirical half-cycles to target half-cycles.
 *
 * In Phase A, these constants move to src/params/game/worldParams.js.
 * For now they live here so calibration runs against the target pipeline
 * without requiring game code changes.
 *
 * Calibration targets (radius-50 map, ~100 hex span):
 *   CONTINENT:        4-8 half-cycles  (λ=12-25 hex)
 *   ELEVATION_DETAIL: 15-25 half-cycles (λ=4-7 hex)
 *   RIDGE:            5-10 half-cycles  (λ=10-20 hex)
 *   MOISTURE:         4-8 half-cycles   (λ=12-25 hex)
 *   TEMP_VARIATION:   20-40 half-cycles (λ=2.5-5 hex)
 *   REGION:           8-12 half-cycles  (λ=8-12 hex)
 */

export const NOISE_CONFIG = {

  // ── Elevation layers ──────────────────────────────────────────────
  // Frequencies calibrated from zero-crossing analysis across 2 seeds × r=50.
  // CORRECTION FACTOR: empirical zero-crossings ÷ target half-cycles.
  // CONTINENT target 4-8 half-cycles, current 36.5 → ÷6
  CONTINENT: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.00012,
  },
  // ELEVATION_DETAIL target ~20 half-cycles, current ~182 → ÷9
  ELEVATION_DETAIL: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.0025,
  },
  // RIDGE target 5-10 half-cycles, current ~48 → ÷6
  RIDGE: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.0012,
  },

  // ── Climate fields ────────────────────────────────────────────────
  // MOISTURE target 4-8 half-cycles, current ~35 → ÷6
  MOISTURE: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.0008,
  },
  // TEMP_VARIATION target ~30 half-cycles (λ~3 hex), current ~431 → ÷14
  TEMP_VARIATION: {
    octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.005,
  },
  // REGION: increased to 3 octaves for stable regional structure.
  // At f=0.003, 3 octaves give ~2 cycles of FBM structure per map plus sub-cell texture.
  // Expected: ~6-12 half-cycles (target 8-12).
  REGION: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.003,
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
