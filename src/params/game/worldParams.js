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
