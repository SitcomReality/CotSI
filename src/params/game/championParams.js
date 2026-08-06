/**
 * championParams.js — Champion starting stats and base values.
 */

/** Minimum hex distance between faction starting bases (floor). */
export const MIN_BASE_DISTANCE_FLOOR = 4;
/** Fraction of map radius used to calculate minimum base distance. */
export const MIN_BASE_DISTANCE_RADIUS_FRACTION = 0.15;
/** Champion starting hit points. */
export const CHAMPION_STARTING_HP = 100;
/** Champion maximum hit points. */
export const CHAMPION_MAX_HP = 100;
/** Base movement points per turn. */
export const CHAMPION_BASE_MOVE = 5;
/** Sight range in hexes (field of view). */
export const CHAMPION_SIGHT_RANGE = 2;
/** Starting gold. */
export const CHAMPION_STARTING_GOLD = 24;
/** Bonus move from Spur artifact. */
export const SPUR_MOVE_BONUS = 1;
/** Bonus move for Verdant faction. */
export const VERDANT_MOVE_BONUS = 1;
/** Minimum daily moves floor. */
export const MIN_DAILY_MOVES = 1;
/** Sight-range bonus when champion has the 'lens' artifact. */
export const ARTIFACT_SIGHT_BONUS = 1;
/**
 * Hard render cap for sight, in hexes. No geometry — terrain, water,
 * features, entities, or fog holes — is ever rendered beyond this distance
 * from a living human champion, explored or not. This is a render bound only:
 * it does not raise actual champion sight (base 2 + lens 1 → max 3).
 */
export const SIGHT_RENDER_CAP = 5;
