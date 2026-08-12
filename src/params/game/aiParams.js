/**
 * aiParams.js — Bot AI decision thresholds, weights, and probabilities.
 */

/** Multiplier of the champion's daily reach (AP ÷ typical cost) added to bot search radius. */
export const BOT_SEARCH_MOVE_MULTIPLIER = 2;
/** Flat extra hexes added to bot target-search radius. */
export const BOT_SEARCH_PADDING = 5;

/** Champion HP threshold below which tree-healing targets get a higher score. */
export const BOT_TREE_HP_THRESHOLD = 60;
/** Tree target score when champion HP is below threshold (needs healing). */
export const BOT_TREE_SCORE_INJURED = 28;
/** Tree target score when champion HP is at or above threshold (healthy). */
export const BOT_TREE_SCORE_HEALTHY = 10;
/** Knot (God's Knot) target score. */
export const BOT_KNOT_SCORE = 32;
/** Base bot target score per reward-bearing feature kind (featureRewards.js). */
export const BOT_FEATURE_SCORES = {
  treasureChest: 34,
  nullLily: 34,
  volvelle: 32,
  witnessStone: 30,
  palimpsestSlab: 30,
  ouroborosLoop: 30,
  vegetableLamb: 28,
  errataSlip: 28,
  peridexionTree: 28,
  screamroot: 26,
  drownedCopyist: 26,
  dustbleedCrystal: 26,
  listenerLichen: 26,
  gildedInitial: 24,
  censerSaint: 24,
  scoriaRose: 24,
  saintsRib: 24,
  edenMushroom: 24,
  waxbloom: 22,
  foolsFire: 22,
  halfDrawnObelisk: 22,
  snowperson: 20,
  cinderbloom: 20,
  edenShroomlet: 18,
};
/** Extra bot target score for heal-bearing features when the champion is injured. */
export const BOT_FEATURE_HEAL_BONUS = 10;
/** Exploration bonus score for unexplored tiles. */
export const BOT_EXPLORE_BONUS = 5;
/** Distance decay factor: score / (1 + d * DECAY). */
export const BOT_DISTANCE_DECAY = 0.7;

/** Minimum champion HP threshold to consider attacking an adjacent champion. */
export const BOT_ATTACK_CHAMPION_HP_THRESHOLD = 35;
/** Random threshold: attack champion only if rng > this value (0-1). */
export const BOT_ATTACK_CHAMPION_CHANCE = 0.55;
/** Minimum champion HP threshold to consider attacking an adjacent mob. */
export const BOT_ATTACK_MOB_HP_THRESHOLD = 28;
/** Random threshold: attack mob only if rng > this value (0-1). */
export const BOT_ATTACK_MOB_CHANCE = 0.4;
