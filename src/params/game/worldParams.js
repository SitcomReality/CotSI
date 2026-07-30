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

/** Moisture field: medium-scale. Absolute frequency — same physical scale at all radii. */
export const NOISE_MOISTURE = { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.02 };

// ---------------------------------------------------------------------------
// Phase B noise configuration
// ---------------------------------------------------------------------------

/** Detail elevation: absolute frequency (~10-hex local relief at all radii). */
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.10,
};

/** Ridge noise: absolute frequency (~25-hex mountain chains at all radii). Uses ridged FBM for sharp mountain crests. */
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.04, offset: 0.9,
};

/** Temperature variation: multi-octave for local microclimate jitter, creating cold pockets for tundra/frigid silence. */
export const NOISE_TEMP_VARIATION = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.08,
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
// Epicenter config (supernatural biome placement)
// Density determines how many epicenter seeds are placed via dart-throwing.
// Radius scales with map radius via per-biome radiusFraction.
// ---------------------------------------------------------------------------

export const EPICENTER_CONFIG = {
  density:           0.0008,  // epicenters per unit hex area
  minDistFraction:   0.14,    // min distance between epicenters, as fraction of radius
  maxEpicenters:     12,      // hard cap on any map
};

// ---------------------------------------------------------------------------
// Slope calibration
// ---------------------------------------------------------------------------

/**
 * Slope normalization divisor for computeSlope().
 * Derived from the 95th percentile of per-tile average elevation deltas
 * across 200-seed × 4-radius batch analysis (batch 010).
 * SN=0.0636 means p95 avg delta maps to slope ≈ 1.0.
 *
 * Effect on common deltas:
 *   avgDelta 0.016  → slope 0.25 (hill threshold)
 *   avgDelta 0.025  → slope 0.40 (plateau threshold)
 *   avgDelta 0.064  → slope 1.00 (p95 — clamped)
 */
export const SLOPE_NORMALIZATION = 0.0597;

/** Maximum lookup radius for border-ring sampling in per-chunk generation.
 *  Covers slope ±1 (computeSlope needs 6 neighbors) + water BFS ±2 = 3. */
export const MAX_LOOKUP_RADIUS = 3;

// ---------------------------------------------------------------------------
// Default terrain rules — consumed by classifyTerrain (Phase A+).
// Percentile-based thresholds derived from batch analysis (batch 010).
// Re-derive after any change to worldShape or elevation formulas.
// ---------------------------------------------------------------------------

export const DEFAULT_TERRAIN_RULES = {
  // Elevation thresholds — derived from 500-seed × 4-radius batch (batch 011, moisture k/radius scaling)
  waterMaxElevation:        0.1200, // p12 — ~12% water coverage
  mountainThreshold:        0.4800, // p90 — top 10% elevation
  peakThreshold:            0.5800, // p97 — top 3% elevation (subset of mountain)
  floatingIslandThreshold:  0.6600, // p99.5 — top 0.5% elevation
  marshMaxElevation:        0.2400, // p35
  hillElevationMin:         0.3200, // p55

  // Slope thresholds — derived from batch 011. SN=0.0597 so raw delta p95→1.0.
  // plateauSlopeMin=0.40 and hillSlopeMin=0.25 carry over pending visual validation
  // after SN update — re-evaluate in next batch.
  plateauSlopeMin:          0.40,
  hillSlopeMin:             0.25,

  // Moisture thresholds — derived from batch 011 (moisture k/radius scaling)
  forestMinMoisture:        0.5800, // p72
  denseForestMinMoisture:   0.6400, // p85
  desertMaxMoisture:        0.3600, // p20 land-only moisture
  marshMinMoisture:         0.5200, // p58

  // Temperature — derived from batch 011
  freezeTempMax:            0.5000, // p15

  // Water moisture gate — holds pending batch 011 re-run with new SN.
  // waterMaxElevation=0.12 gives ~12% low-elevation tiles; at waterMinMoisture=0.32
  // roughly two-thirds of those qualify, targeting ~8-10% total water.
  waterMinMoisture:         0.32,
  treeLineMax:              0.85,
  snowLineMax:              0.15,
};

// ---------------------------------------------------------------------------
// River configuration (Phase D)
// ---------------------------------------------------------------------------

/** Minimum elevation percentile for river source candidates. */
export const RIVER_SOURCE_MIN_ELEV    = 0.65;
/** Minimum base moisture for river source candidates. */
export const RIVER_SOURCE_MIN_MOIST   = 0.45;
/** Fraction of tiles selected as river sources. */
export const RIVER_SOURCE_FRACTION    = 0.0005;
/** Maximum trace steps per river. */
export const RIVER_MAX_LENGTH         = 200;
/** Moisture boost added to tiles near rivers. */
export const RIVER_MOISTURE_BOOST     = 0.15;
/** Radius in hexes for river moisture boost. */
export const RIVER_BOOST_RADIUS       = 1;
