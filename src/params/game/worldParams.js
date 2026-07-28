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

/** Moisture field: medium-scale. Frequency 0.006 confirmed by Phase 0 calibration. */
export const NOISE_MOISTURE = { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.006 };

// ---------------------------------------------------------------------------
// Phase B noise configuration
// ---------------------------------------------------------------------------

/** Detail elevation: medium frequency (~10-hex scale). */
export const NOISE_ELEVATION_DETAIL = {
  octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020,
};

/** Ridge noise: low frequency (~25-hex scale). Uses ridged FBM for sharp mountain crests. */
export const NOISE_RIDGE = {
  octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.008, offset: 0.9,
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

/**
 * Slope normalization divisor for computeSlope().
 * Derived from r=21-specific avgDelta distribution (p95 ~0.030), targeting
 * gameSlope ≈0.75 at p95 so the top end of the range discriminates genuine
 * steep terrain. The pooled (all-radii) p95 of 0.0133 was dominated by
 * r=100 tiles (78% of total) with near-zero slope.
 *
 * With SN=0.040, r=21's three raw-delta tiers map to usable slope values:
 *   avgDelta 0.000 → slope 0.00 (flat)
 *   avgDelta 0.020 → slope 0.50 (moderate)
 *   avgDelta 0.040 → slope 1.00 (steep)
 */
export const SLOPE_NORMALIZATION = 0.040;

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
  // Elevation thresholds — derived from 500-seed × 3-radius batch analysis (Phase G batch 003, post-SN-fix)
  waterMaxElevation:        0.016, // p14 — low-elevation tiles become water candidates
  mountainThreshold:        0.260, // p90
  peakThreshold:            0.350, // p97 (slightly conservative vs batch-derived 0.400 to prevent undercount)
  floatingIslandThreshold:  0.520, // p99.5
  marshMaxElevation:        0.060, // p42 — raised from p35 to widen marsh's low-elevation catchment
  hillElevationMin:         0.080, // p55

  // Slope thresholds — calibrated from Phase G batch 004.
  // With SN=0.040, r=21 slopes map to 0.0 (flat), 0.50 (moderate), 1.0 (steep).
  // plateauSlopeMin=0.40: moderate-slope high-elevation tiles (0.50 > 0.40) become
  // mountain rather than plateau, targeting ~5% mountain + ~5% plateau at r=21.
  // hillSlopeMin=0.25: both moderate and steep mid-elevation tiles become hills.
  plateauSlopeMin:          0.40,  // above this → mountain, below → plateau
  hillSlopeMin:             0.25,

  // Moisture thresholds — derived from Phase G batch 003
  forestMinMoisture:        0.640, // p72
  denseForestMinMoisture:   0.700, // p85
  desertMaxMoisture:        0.180, // p5 of land-only moisture — pooled histograms include water/ice tiles
  marshMinMoisture:         0.480, // p50 — generous floor to increase marsh from current 1.3%

  // Temperature — derived from batch analysis
  freezeTempMax:            0.540, // p15

  // Water moisture gate — batch-derived.
  // waterMaxElevation=0.016 gives ~14% low-elevation tiles; at waterMinMoisture=0.32
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
