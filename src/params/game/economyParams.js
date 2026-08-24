/**
 * economyParams.js — Gold costs, heal amounts, dig values, and artifact economy.
 */

// ---- Trader economy ----
/** Healing Salve purchase cost in gold. */
export const TRADER_HEAL_COST = 14;
/** Healing Salve heal amount. */
export const TRADER_HEAL_AMOUNT = 10;
/** Potency purchase cost in gold (per pip). */
export const TRADER_POTENCY_COST = 22;
/** Number of stock slots a trader offers per reset (one per combat potency pip). */
export const TRADER_STOCK_SIZE = 7;
/** Max pips of one faction stacked in a single potency slot. */
export const TRADER_POTENCY_STACK_MAX = 3;
/** Relic purchase cost in gold (per relic). */
export const TRADER_RELIC_COST = 30;
/** Max relics stacked in a single relic slot. */
export const TRADER_RELIC_STACK_MAX = 2;
/** Fraction of an item's gold cost refunded when it is replaced/destroyed. */
export const EQUIP_REFUND_FRACTION = 0.5;

// ---- Forge (equipment upgrade site) ----
/** God's Knots cost to upgrade an equipped item by one step. */
export const FORGE_KNOT_COST = 2;
/** Bonus increase per upgrade step (placeholder — un-tuned). */
export const FORGE_BONUS_STEP = 1;

// ---- Base interaction ----
/** Sanctuary heal fraction of max HP. */
export const SANCTUARY_HEAL_FRACTION = 0.5;
/** Discounted potency purchase cost (unique faction). */
export const POTENCY_COST_DISCOUNTED = 14;
/** Standard potency purchase cost. */
export const POTENCY_COST_STANDARD = 18;

// ---- Blessed Font ----
/** Blessed Font heal amount for Verdant faction. */
export const BLESSED_FONT_HEAL_VERDANT = 34;
/** Blessed Font heal amount for other factions. */
export const BLESSED_FONT_HEAL_STANDARD = 18;

// ---- God's Knots ----
/** Default God's Knot amount on a tile. */
export const KNOT_DEFAULT_AMOUNT = 2;

// ---- Treasure chests ----
/** Base gold granted by a treasure chest. */
export const CHEST_GOLD_BASE = 10;
/** Random extra gold spread: floor(roll * CHEST_GOLD_VARIATION_SCALE) % CHEST_GOLD_VARIATION_MOD. */
export const CHEST_GOLD_VARIATION_SCALE = 15;
export const CHEST_GOLD_VARIATION_MOD = 15;

// ---- Map feature rewards (featureRewards.js) ----
/** Regrow timer in days shared by all replenishable features. */
export const FEATURE_REGROW_DAYS = 4;
/** Relic granted by relic-direct features (Palimpsest Slab, Witness-Stone choice). */
export const FEATURE_RELIC_AMOUNT = 1;
/** Gold granted by Dustbleed Crystal (direct). */
export const FEATURE_CRYSTAL_GOLD = 10;
/** God's Knots granted by knot-direct features (Vegetable Lamb, Drowned Copyist). */
export const FEATURE_KNOTS_AMOUNT = 2;
/** HP granted by Vegetable Lamb (direct). */
export const FEATURE_LAMB_HEAL = 6;
/** Defense buff granted by Drowned Copyist (this turn). */
export const FEATURE_COPYIST_DEFENSE = 2;
/** Heal granted by Waxbloom (replenishable). */
export const FEATURE_WAXBLOOM_HEAL = 10;
/** Heal granted by Cinderbloom (replenishable). */
export const FEATURE_CINDERBLOOM_HEAL = 6;
/** Heal granted by Eden Mushroom (replenishable). */
export const FEATURE_EDEN_MUSHROOM_HEAL = 12;
/** Heal granted by Eden Shroomlet (replenishable). */
export const FEATURE_EDEN_SHROOMLET_HEAL = 6;
/** Heal granted by Peridexion Tree (replenishable). */
export const FEATURE_PERIDEXION_HEAL = 8;
/** Defense buff granted by Peridexion Tree (this turn). */
export const FEATURE_PERIDEXION_DEFENSE = 2;
/** God's Knots granted by Scoria Rose (replenishable). */
export const FEATURE_SCORIA_KNOTS = 2;
/** Movement buff granted by Snowperson (this turn). */
export const FEATURE_SNOWPERSON_MOVEMENT = 20;
/** Defense buff granted by Saint's Rib (this turn). */
export const FEATURE_RIBS_DEFENSE = 3;
/** Attack/defense buff offered by Gilded Initial (this turn). */
export const FEATURE_INITIAL_BUFF = 3;
/** Attack buff granted by Censer Saint's blessing side (this turn). */
export const FEATURE_CENSER_ATTACK = 4;
/** HP cost of Censer Saint's blessing side (never fatal). */
export const FEATURE_CENSER_HP_COST = 4;
/** Gold offered as the safe side of most choices. */
export const FEATURE_CHOICE_GOLD_STANDARD = 8;
/** Gold offered by richer choice features (Ouroboros Loop, Errata Slip). */
export const FEATURE_CHOICE_GOLD_RICH = 10;
/** Gold offered by the Witness-Stone. */
export const FEATURE_CHOICE_GOLD_WITNESS = 12;
/** God's Knots offered by Screamroot's risky side. */
export const FEATURE_SCREAMROOT_RISK_KNOTS = 6;
/** HP cost of Screamroot's risky side (never fatal). */
export const FEATURE_SCREAMROOT_HP_COST = 8;
/** God's Knots offered by Screamroot's safe side. */
export const FEATURE_SCREAMROOT_SAFE_KNOTS = 2;
/** Movement offered as a choice side (Fool's-Fire, Half-Drawn Obelisk). */
export const FEATURE_CHOICE_MOVEMENT = 20;

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
