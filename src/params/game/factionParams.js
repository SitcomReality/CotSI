/**
 * factionParams.js — Faction counts, potency defaults, and faction ability parameters.
 */

/** Number of factions in the game. */
export const FACTION_COUNT = 7;
/** Default potency per non-owned faction. */
export const DEFAULT_POTENCY = 1;
/** Own-faction starting potency. */
export const OWN_FACTION_POTENCY = 3;
/** Default primary potency boost value. */
export const PRIMARY_POTENCY_BOOST = 5;
/** Mob base potency. */
export const MOB_BASE_POTENCY = 3;
/** Mob own-faction potency bonus. */
export const MOB_OWN_FACTION_POTENCY_BONUS = 5;

// ---- Faction ability values ----
/** Reverie outcome range (0 to N-1 possible results). */
export const REVERIE_OUTCOME_RANGE = 5;
/** Gold gained from Reverie (roll 0). */
export const REVERIE_GOLD_GAIN = 4;
/** Bonus moves from Reverie (roll 1). */
export const REVERIE_AP_BONUS = 10;
/** HP healed by Reverie (roll 2). */
export const REVERIE_HP_HEAL = 4;

/** Faction index for Everknown (special faction checks). */
export const FACTION_EVERKNOWN = 3;
/** Faction index that gets discounted potency purchase (Heart). */
export const FACTION_DISCOUNT = 4;
/** Faction index for Verdant (special movement checks). */
export const FACTION_VERDANT = 2;
