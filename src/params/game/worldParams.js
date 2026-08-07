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
/** Noise channel base for tiered feature-placement gating (per-rule salt = base + rule index). */
export const NOISE_CHANNEL_FEATURE_TIER = 5;
/** Mountain peak classification: minimum mountain-neighbor count (out of 6). */
export const MOUNTAIN_PEAK_MIN_NEIGHBORS = 4;
/** Water-type classification: max BFS depth for lake-vs-ocean check. */
export const WATER_BFS_MAX_DEPTH = 3;
/** Ocean edge-detection epsilon buffer. */
export const OCEAN_EDGE_BUFFER = 0.5;

/** Moisture added per adjacent water tile (coastal boost, radius-2 scan). */
export const WATER_MOISTURE_BOOST = 0.03;

/** Rain shadow (computeRainShadow): prevailing wind direction (upwind offset per distance step). */
export const RAIN_SHADOW_WIND = { dq: -1, dr: 0 };
/** Rain shadow: distances (in hexes) sampled upwind. */
export const RAIN_SHADOW_DISTANCES = [1, 2, 3];
/** Rain shadow: minimum upwind-average elevation surplus before drying applies. */
export const RAIN_SHADOW_ELEV_THRESHOLD = 0.2;
/** Rain shadow: drying factor applied to the elevation surplus above the threshold. */
export const RAIN_SHADOW_DRYING = 0.3;

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

/** Seed offset for detail elevation layer. */
export const SEED_DETAIL = 0x7B2C1E8D;

/** Seed offset for ridge elevation layer. */
export const SEED_RIDGE = 0x3F5A9B2C;

// ---------------------------------------------------------------------------
// Phase B base-field shaping (sampleBaseFields.js)
// ---------------------------------------------------------------------------

/** Detail/ridge elevation mix weight (the two layers sum to 2× this). */
export const ELEVATION_DETAIL_MIX = 0.50;
/** Hypsometric curve exponent — spreads the low-mid elevation range. */
export const HYPSOMETRIC_EXPONENT = 0.6;

/** Temperature: neutral baseline. */
export const TEMP_BASE = 0.5;
/** Temperature: latitude gradient weight (widened 0.55→0.80 in batch 011). */
export const TEMP_LATITUDE_WEIGHT = 0.80;
/** Temperature: local variation weight. */
export const TEMP_VARIATION_WEIGHT = 0.35;
/** Temperature: elevation lapse rate (raised 0.30→0.40 in batch 011). */
export const TEMP_ELEVATION_LAPSE = 0.40;

// ---------------------------------------------------------------------------
// Epicenter config (supernatural biome placement)
// Density determines how many epicenter seeds are placed via dart-throwing.
// Radius scales with map radius via per-biome radiusFraction.
// ---------------------------------------------------------------------------

export const EPICENTER_CONFIG = {
  density:             0.0008, // epicenters per unit hex area
  minDistFraction:     0.14,   // min distance between epicenters, as fraction of radius
  maxEpicenters:       12,     // hard cap on any map
  noiseFrequency:      0.008,  // low-frequency FBM for regional biome clustering
  maxAttemptsPerTarget: 50,    // dart-throw rejection attempts per epicenter
  minAbsDist:          4,      // absolute floor for epicenter min distance (hexes)
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

/** Minimum elevation gap between a water tile and adjacent land (world Y units). */
export const WATER_LAND_GAP = 0.02;
/** Depth a river channel is carved below its adjacent banks (world Y units). */
export const RIVER_BED_DEPTH = 0.10;

/**
 * Elevation assumed for out-of-chunk border samples during slope computation.
 * Missing fieldMap entries at chunk borders are expected border sampling,
 * not bad data — border hexes default to sea level.
 */
export const SEA_LEVEL_ELEVATION = 0;

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
  // plateauSlopeMin raised from 0.40→0.50 to convert some steep mountain tiles
  // to flat high-elevation plateau, targeting 2-3% plateau coverage.
  plateauSlopeMin:          0.50,
  hillSlopeMin:             0.25,

  // Moisture thresholds — derived from batch 011 (moisture k/radius scaling)
  // desertMaxMoisture lowered from 0.36→0.30 to rein in desert at large radii
  // where land-moisture distribution shifts drier.
  forestMinMoisture:        0.5800, // p72
  denseForestMinMoisture:   0.6400, // p85
  desertMaxMoisture:        0.3000, // p15 land-only moisture
  marshMinMoisture:         0.5200, // p58

  // Temperature — derived from batch 011
  freezeTempMax:            0.5000, // p15

  // Water moisture gate — holds pending batch 011 re-run with new SN.
  // waterMaxElevation=0.12 gives ~12% low-elevation tiles; at waterMinMoisture=0.32
  // roughly two-thirds of those qualify, targeting ~8-10% total water.
  waterMinMoisture:         0.32,
  treeLineMax:              0.85,
};

// ---------------------------------------------------------------------------
// Feature density (featureDensity.js)
// Tree/fruit feature density shaping. The moisture values here form one
// family with DEFAULT_TERRAIN_RULES.forestMinMoisture (0.58):
//   moistRamp 0.72            — tree density ramps up only above the
//                               dense-forest moisture, well past the forest floor.
//   fruitTreeMinMoisture 0.60 — fruit trees need moisture above the forest floor
//                               but below the dense-forest ramp.
// Re-derive the family together if the moisture distribution shifts.
// ---------------------------------------------------------------------------

export const FEATURE_DENSITY = {
  baseline:            0.5,  // plains baseline density
  moistRamp:           0.72, // tree density ramp start (moisture)
  moistSpan:           0.28, // ramp width: moisture 0.72 → 1.0 maps factor 0 → 1
  treeLineHalf:        0.5,  // elevation penalty starts above half the tree line
  treeDensityScale:    0.8,  // tree density scale (× elevFactor)
  treeDensityMin:      0.2,  // tree density floor
  plainsMoistFactor:   0.6,  // plains/hill density: moisture × this
  plainsOffset:        0.1,  // plains/hill density: + this
  marshMoistFactor:    0.4,  // marsh density: moisture × this
  desertMoistFactor:   0.15, // desert density: moisture × this
  fruitTreeMinMoisture: 0.60, // fruit-tree climate gate
};

// ---------------------------------------------------------------------------
// Tiered + banded feature placement (featureSpawning.js; featureDesign.md §3)
// Better features are more frequent toward the map center. Each tier gates its
// features by distance from the map center:
//   gate  — acceptance probability at the map edge (0 = never at the edge);
//           ramps linearly to 1.0 at the center.
//   inner — fraction of the map radius inside which the tier can spawn at all
//           (1.0 = everywhere). Outside `inner` the gate is 0.
// T1 is uniform (gate 1.0); T2 ramps mildly; T3 ramps strongly; T4 spawns
// only inside the inner half of the map. Rules without a `tier` field are T1.
// ---------------------------------------------------------------------------

export const FEATURE_TIERS = {
  T1: { gate: 1.0, inner: 1.0 },
  T2: { gate: 0.55, inner: 1.0 },
  T3: { gate: 0.2, inner: 1.0 },
  T4: { gate: 0.0, inner: 0.5 },
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

// ---------------------------------------------------------------------------
// Lazy chunk management (state/chunkManager.js)
// ---------------------------------------------------------------------------

/**
 * Eager-generation radius (hexes) around each spawn target. The starting
 * region (all chunks touching these discs) is generated at creation with the
 * global post-passes; everything beyond generates lazily from the seed.
 * Maps with radius ≤ STARTING_REGION_RADIUS + spawn slack generate entirely
 * eager, preserving the classic full-map behavior.
 */
export const STARTING_REGION_RADIUS = 20;

/** Days a generated chunk may sit with no entities before eviction. */
export const CHUNK_EVICTION_GRACE_DAYS = 10;

/** Buffer (chunk cells) of background pre-generation around a champion. */
export const BACKGROUND_BUFFER_CHUNKS = 2;

/** Milliseconds between background chunk generations (frame spread). */
export const BACKGROUND_GEN_SPREAD_MS = 8;
