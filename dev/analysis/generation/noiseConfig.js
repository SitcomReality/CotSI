/**
 * noiseConfig.js — Noise configuration for Phase 0 calibration.
 *
 * Matches the target pipeline from overview.md §6. This file is the single
 * source of truth for calibration noise parameters — sampleBaseFields,
 * frequencyVerification, and the calibration UI all import from here.
 *
 * FREQUENCY STATUS (as of 100-seed calibration run, r=100, glut-17 base):
 *
 * Zero-crossing counting proved UNRELIABLE as a calibration method.
 * The zero-crossings are dominated by simplex kernel gradient jitter within
 * individual simplex cells, not FBM structural cycles.
 *
 * The continent mask was REMOVED from the design (see overview.md) — it was
 * the root cause of compressed elevation distribution [0.12, 0.44], zero slope,
 * and calibration complexity. Elevation is now additive: detail + ridges,
 * shaped by an explicit worldShape(distanceFromCenter, radius) function.
 *
 * The ORIGINAL frequencies from overview.md §6 produce visible macro-structure.
 * The one confirmed good change: REGION at f=0.003 with 3 octaves (was 0.0015/2oct)
 * produces ~9 half-cycles across the map, matching the 8-12 target.
 *
 * VERDICT: Use original frequencies. Quantile normalization (CDF LUTs) handles
 * distribution. Phase G tunes thresholds against the full pipeline.
 *
 * In Phase A, these constants move to src/params/game/worldParams.js.
 */

export const NOISE_CONFIG = {

  // ── Elevation layers ──────────────────────────────────────────────
  // ORIGINAL FREQUENCIES from overview.md §6 — produce correct macro-scale.
  // Continent mask removed — elevation is additive: detail + ridges,
  // shaped by worldShape(distanceFromCenter, radius).
  ELEVATION_DETAIL: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,
  },
  RIDGE: {
    octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008, offset: 0.9,
  },

  // ── Climate fields ────────────────────────────────────────────────
  MOISTURE: {
    octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006,
  },
  TEMP_VARIATION: {
    octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08,
  },
  // REGION: f=0.003 with 3 octaves confirmed good across 100 seeds × r=100.
  // Produces ~9 half-cycles, matching target 8-12 for 4-6 biome regions.
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
  'SEED_DETAIL', 'SEED_RIDGE', 'SEED_MOISTURE',
  'SEED_TEMP', 'SEED_REGION_M', 'SEED_REGION_T',
  'SEED_FEATURES', 'SEED_DEBRIS', 'SEED_DEBRIS_KIND',
];

/**
 * Convenience: list of noise field names for iteration.
 */
export const NOISE_FIELDS = [
  { key: 'ELEVATION_DETAIL', label: 'Elevation detail' },
  { key: 'RIDGE', label: 'Ridge noise' },
  { key: 'MOISTURE', label: 'Moisture' },
  { key: 'TEMP_VARIATION', label: 'Temperature variation' },
  { key: 'REGION', label: 'Region bias' },
];
