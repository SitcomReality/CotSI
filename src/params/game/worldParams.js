/**
 * worldParams.js — World simulation, days, and shared game-world constants.
 */

/** Days per in-game week. */
export const DAYS_PER_WEEK = 7;

/** Probability a mob harasses an adjacent champion (0-1). */
export const MOB_HARASS_CHANCE = 0.55;
/** Base damage from mob harassment. */
export const MOB_HARASS_DMG_BASE = 4;
/** Random damage range added to mob harassment (Math.random() * N). */
export const MOB_HARASS_DMG_RANGE = 5;
/** Probability a mob wanders to a random neighbor hex (0-1). */
export const MOB_WANDER_CHANCE = 0.45;

/** Maximum number of log entries retained in state. */
export const MAX_LOG_ENTRIES = 100;

/** Noise channel index for feature sprinkling. */
export const NOISE_CHANNEL_FEATURES = 4;
/** Noise channel index for debris spawn roll. */
export const NOISE_CHANNEL_DEBRIS = 5;
/** Noise channel index for debris kind selection. */
export const NOISE_CHANNEL_DEBRIS_KIND = 6;
/** Debris spawn noise threshold. */
export const DEBRIS_SPAWN_THRESHOLD = 0.92;
/** Debris kind threshold: tuft (≤threshold). */
export const DEBRIS_TUFT_THRESHOLD = 0.4;
/** Debris kind threshold: rock (≤threshold). */
export const DEBRIS_ROCK_THRESHOLD = 0.7;
/** Mountain peak classification: minimum mountain-neighbor count (out of 6). */
export const MOUNTAIN_PEAK_MIN_NEIGHBORS = 4;
/** Water-type classification: max BFS depth for lake-vs-ocean check. */
export const WATER_BFS_MAX_DEPTH = 3;
/** Ocean edge-detection epsilon buffer. */
export const OCEAN_EDGE_BUFFER = 0.5;

/** Base knot amount before variation. */
export const KNOT_BASE_AMOUNT = 2;
/** Scale factor for knot-amount variation formula. */
export const KNOT_AMOUNT_VARIATION_SCALE = 100;
/** Modulo bound for knot-amount variation. */
export const KNOT_AMOUNT_VARIATION_MOD = 3;

// ---------------------------------------------------------------------------
// Noise configuration
// ---------------------------------------------------------------------------

/** Moisture field: medium-scale. Frequency 0.006 confirmed by Phase 0 calibration. */
export const NOISE_MOISTURE = { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006 };

// ---------------------------------------------------------------------------
// Phase B noise configuration
// ---------------------------------------------------------------------------

/** Detail elevation: medium frequency (~10-hex scale). */
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,
};

/** Ridge noise: low frequency (~25-hex scale). Regular FBM placeholder until Phase F. */
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008,
};

/** Temperature variation: very high frequency for local microclimate jitter. */
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08,
};

/** Region bias: large-scale, 3 octaves for soft regional transitions. */
export const NOISE_REGION = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.003,
};

// ---------------------------------------------------------------------------
// Seed offsets (Phase A pipeline)
// ---------------------------------------------------------------------------

export const SEED_MOISTURE    = 0x8C6E4F1A;
export const SEED_TEMP        = 0x2D7B8E3F;
export const SEED_REGION_M    = 0x5A1C9D6E;
export const SEED_REGION_T    = 0x9F3E7B4A;
export const SEED_FEATURES    = 0x1E4A7C9D;
export const SEED_DEBRIS      = 0xD8F3A5B1;
export const SEED_DEBRIS_KIND = 0x4C7E2F9A;

/** Seed offset for detail elevation layer. */
export const SEED_DETAIL = 0x7B2C1E8D;

/** Seed offset for ridge elevation layer. */
export const SEED_RIDGE = 0x3F5A9B2C;

// ---------------------------------------------------------------------------
// Epicenter grid (supernatural biome placement)
// Cell size determines epicenter seed density. Each cell gets one seed at a
// deterministically jittered position. Coverage tuning deferred to Phase G.
// ---------------------------------------------------------------------------

export const EPICENTER_GRID = {
  cellSize:          45,    // hex units between grid cell centres
  jitterAmplitude:   0.40,  // fraction of cell size for position jitter
};

// ---------------------------------------------------------------------------
// Slope calibration
// ---------------------------------------------------------------------------

/** 95th-percentile of per-tile mean neighbor elevation delta (calibrated in Phase 0). */
export const SLOPE_NORMALIZATION = 0.3;

/** Maximum lookup radius for border-ring sampling in per-chunk generation.
 *  Covers slope ±1 (computeSlope needs 6 neighbors) + water BFS ±2 = 3. */
export const MAX_LOOKUP_RADIUS = 3;

// ---------------------------------------------------------------------------
// Default terrain rules — consumed by classifyTerrain (Phase A+).
// Elevation percentile-based thresholds populated from calibration_v1.json
// (run "Derive Thresholds" in the analysis tool → download calibration_v1.json).
// Slope thresholds added in Phase B.
// ---------------------------------------------------------------------------

export const DEFAULT_TERRAIN_RULES = {
  // Elevation thresholds — calibrated from FBM distribution (calibration_v1.json)
  waterMaxElevation:        0.32,  // p12
  mountainThreshold:        0.68,  // p90
  peakThreshold:            0.74,  // p97
  floatingIslandThreshold:  0.82,  // p99.5
  marshMaxElevation:        0.42,  // p35
  hillElevationMin:         0.55,  // p55 (calibrated)

  // Slope thresholds — Phase B
  plateauSlopeMin:          0.08,  // below this → plateau, above → mountain
  hillSlopeMin:             0.10,

  // Moisture thresholds — calibrated from moisture distribution
  forestMinMoisture:        0.58,  // p72
  denseForestMinMoisture:   0.64,  // p85
  desertMaxMoisture:        0.34,  // p20
  marshMinMoisture:         0.52,  // p58

  // Temperature
  freezeTempMax:            0.40,  // p15

  // Not calibrated (keep hand-tuned)
  waterMinMoisture:         0.50,
  treeLineMax:              0.85,
  snowLineMax:              0.15,
};
