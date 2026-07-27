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

/** Noise channel index for elevation sampling. */
export const NOISE_CHANNEL_ELEVATION = 1;
/** Noise channel index for moisture sampling. */
export const NOISE_CHANNEL_MOISTURE = 2;
/** Noise channel index for biome region assignment (multi-biome). */
export const NOISE_CHANNEL_BIOME = 3;
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

/** Elevation threshold for floating-island terrain (above mountain). */
export const FLOATING_ISLAND_THRESHOLD = 0.985;
/** Elevation threshold for peak terrain (snow-capped mountain variant). */
export const PEAK_THRESHOLD = 0.96;
/** Minimum noise value for a tile to be classified as denseForest. */
export const DENSE_FOREST_MIN_MOISTURE = 0.85;
/** Base knot amount before variation. */
export const KNOT_BASE_AMOUNT = 2;
/** Scale factor for knot-amount variation formula. */
export const KNOT_AMOUNT_VARIATION_SCALE = 100;
/** Modulo bound for knot-amount variation. */
export const KNOT_AMOUNT_VARIATION_MOD = 3;

// ---------------------------------------------------------------------------
// FBM noise configuration
// ---------------------------------------------------------------------------

/** Elevation field: large-scale features with moderate detail. */
export const NOISE_ELEVATION = { octaves: 5, lacunarity: 2.0, gain: 0.5, frequency: 0.004 };

/** Moisture field: medium-scale. Frequency 0.006 confirmed by Phase 0 calibration. */
export const NOISE_MOISTURE = { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006 };

/** Biome regions: very large-scale, only 2 octaves for soft transitions. */
export const NOISE_BIOME = { octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.002 };

// ---------------------------------------------------------------------------
// Phase A noise configuration
// ---------------------------------------------------------------------------

/**
 * Phase A elevation: single additive FBM field.
 * Frequencies confirmed by Phase 0 calibration (see dev/analysis/generation/noiseConfig.js).
 * Replaces old NOISE_ELEVATION — used by the new sampleBaseFields pipeline.
 */
export const NOISE_PHASE_A_ELEVATION = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,
};

/** Temperature variation: very high frequency for local microclimate jitter. */
export const NOISE_TEMP_VARIATION = {
  octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08,
};

/** Region bias: large-scale, 3 octaves for soft regional transitions (replaces NOISE_BIOME in new pipeline). */
export const NOISE_REGION = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.003,
};

// ---------------------------------------------------------------------------
// Seed offsets (Phase A pipeline) — replaces NOISE_CHANNEL_* indices
// ---------------------------------------------------------------------------

export const SEED_MOISTURE    = 0x8C6E4F1A;
export const SEED_TEMP        = 0x2D7B8E3F;
export const SEED_REGION_M    = 0x5A1C9D6E;
export const SEED_REGION_T    = 0x9F3E7B4A;
export const SEED_FEATURES    = 0x1E4A7C9D;
export const SEED_DEBRIS      = 0xD8F3A5B1;
export const SEED_DEBRIS_KIND = 0x4C7E2F9A;

/** Seed offset for elevation noise (Phase A single-field FBM). Same as noiseConfig.js SEED_DETAIL. */
export const SEED_ELEVATION = 0x7B2C1E8D;

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
// Default terrain rules — consumed by the new classifyTerrain in Phase A.
// Elevation percentile-based thresholds populated from calibration_v1.json
// (run "Derive Thresholds" in the analysis tool → download calibration_v1.json).
// ---------------------------------------------------------------------------

export const DEFAULT_TERRAIN_RULES = {
  waterMaxElevation:        0.12,  // p12 target — confirm from calibration_v1.json
  waterMinMoisture:         0.50,
  floatingIslandThreshold:  0.985, // p99.5 target — confirm from calibration_v1.json
  peakThreshold:            0.96,  // p97 target — confirm from calibration_v1.json
  mountainThreshold:        0.905, // p90 target — confirm from calibration_v1.json
  treeLineMax:              0.85,
  snowLineMax:              0.15,
  freezeTempMax:            0.10,
  denseForestMinMoisture:   0.85,
  forestMinMoisture:        0.72,
  desertMaxMoisture:        0.20,
  marshMinMoisture:         0.58,
  marshMaxElevation:        0.35,
};
