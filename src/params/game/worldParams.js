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

/** Moisture field: medium-scale, somewhat finer than elevation. */
export const NOISE_MOISTURE = { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.005 };

/** Biome regions: very large-scale, only 2 octaves for soft transitions. */
export const NOISE_BIOME = { octaves: 2, lacunarity: 2.0, gain: 0.5, frequency: 0.002 };
