/**
 * combatParams.js — Combat scoring, damage, loot, and auto-resolve parameters.
 */

/** Score multiplier when a power beats 2 opponents in Paley. */
export const PALEY_SCORE_MULTI_2_WINS = 2;
/** Score multiplier when a power beats 1 opponent in Paley. */
export const PALEY_SCORE_MULTI_1_WIN = 1.5;
/** Margin artifact: flat final-score bonus. */
export const ARTIFACT_MARGIN_BONUS = 2;

/** Base gold dropped by a defeated entity. */
export const LOOT_GOLD_BASE = 12;
/** Random gold range — gold = LOOT_GOLD_BASE + floor(rng * LOOT_GOLD_RANGE). */
export const LOOT_GOLD_RANGE = 14;

/** Maximum rounds before auto-resolve ends in a draw. */
export const AUTO_RESOLVE_MAX_ROUNDS = 50;

/** Hollow (Vaunted Nothing) faction: HP missing grouped by this for bonus. */
export const HOLLOW_HP_GROUP_SIZE = 10;
/** Hollow faction: weeks-per-multiplier for bonus. */
export const HOLLOW_WEEK_BLOCK = 3;

/** Flee survival cap — fleeing entity survives at min HP. */
export const FLEE_MIN_HP = 1;
/** Minimum rounds before flee is allowed. */
export const FLEE_ROUND_DELAY = 1;
