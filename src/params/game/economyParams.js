/**
 * economyParams.js — Gold costs, heal amounts, dig values, and artifact economy.
 */

// ---- Trader economy ----
/** Moonberry (heal) purchase cost in gold. */
export const TRADER_HEAL_COST = 14;
/** Moonberry heal amount. */
export const TRADER_HEAL_AMOUNT = 10;
/** Potency purchase cost in gold. */
export const TRADER_POTENCY_COST = 22;
/** Weapon purchase cost in gold. */
export const TRADER_WEAPON_COST = 34;
/** Weapon secondary-stat bonus. */
export const TRADER_WEAPON_BONUS = 1;

// ---- Base interaction ----
/** Sanctuary heal fraction of max HP. */
export const SANCTUARY_HEAL_FRACTION = 0.5;
/** Discounted potency purchase cost (unique faction). */
export const POTENCY_COST_DISCOUNTED = 14;
/** Standard potency purchase cost. */
export const POTENCY_COST_STANDARD = 18;

// ---- Fruit trees ----
/** Fruit heal amount for Verdant faction. */
export const FRUIT_HEAL_VERDANT = 34;
/** Fruit heal amount for other factions. */
export const FRUIT_HEAL_STANDARD = 18;
/** Days until a fruit tree regrows. */
export const FRUIT_REGROWTH_DAYS = 4;

// ---- God's Knots ----
/** Default God's Knot amount on a tile. */
export const KNOT_DEFAULT_AMOUNT = 2;

// ---- Treasure chests ----
/** Base gold granted by a treasure chest. */
export const CHEST_GOLD_BASE = 10;
/** Random extra gold spread: floor(roll * CHEST_GOLD_VARIATION_SCALE) % CHEST_GOLD_VARIATION_MOD. */
export const CHEST_GOLD_VARIATION_SCALE = 15;
export const CHEST_GOLD_VARIATION_MOD = 15;

// ---- Dig system ----
/** Probability threshold for digging up a relic (0-1). */
export const DIG_RELIC_CHANCE = 0.075;
/** Upper probability threshold for digging up a potency (0-1). */
export const DIG_POTENCY_CHANCE = 0.33;
/** Base gold amount from a gold dig. */
export const DIG_GOLD_BASE = 7;
/** Random range added to gold dig (Math.random() * N). */
export const DIG_GOLD_RANDOM = 12;
/** Day-divisor for gold scaling (Math.floor(state.day / N)). */
export const DIG_GOLD_DAY_DIVISOR = 7;

// ---- Artifacts ----
/** Ledger artifact: gold granted per turn. */
export const ARTIFACT_LEDGER_GOLD = 2;
/** Bandage artifact: HP healed per turn. */
export const ARTIFACT_BANDAGE_HEAL = 2;
/** Margin artifact: +final combat score. */
export const ARTIFACT_MARGIN_SCORE = 2;
/** Echo Coin artifact: percentage chance for primary potency on gain. */
export const ARTIFACT_ECHO_CHANCE_PCT = 25;
