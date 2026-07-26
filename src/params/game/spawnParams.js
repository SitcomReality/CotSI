/**
 * spawnParams.js — Spawn position and entity-count parameters.
 */

/** Primary search ring limit (max iterations) for base placement. */
export const BASE_SEARCH_MAX_RING = 100;
/** Fraction of map radius used as the base spawn ring (~58%) at the reference radius. */
export const SPAWN_RING_FRACTION = 0.58;
/** Map radius at which SPAWN_RING_FRACTION applies without scaling. */
export const SPAWN_RING_REFERENCE_RADIUS = 21;
/** Per-hex ring fraction increase beyond the reference radius. */
export const SPAWN_RING_RADIUS_SCALE = 0.003;
/** Maximum ring fraction cap (prevents over-push on extreme sizes). */
export const SPAWN_RING_FRACTION_MAX = 0.80;
/** Minimum spawn ring (hex distance from center). */
export const MIN_SPAWN_RING = 2;
/** Fraction of map radius used as spawn jitter (±10%). */
export const SPAWN_JITTER_FRACTION = 0.10;
/** Minimum jitter in hexes. */
export const MIN_SPAWN_JITTER = 1;
/** Edge margin — absolute minimum distance from map edge (hexes). */
export const SPAWN_EDGE_MARGIN = 3;
/** Edge margin fraction — proportional edge clearance used in the outward-jitter clamp on larger maps. */
export const SPAWN_EDGE_MARGIN_FRACTION = 0.15;
/** Angular jitter fraction — each champion's angle scattered by ±15% of a wedge. */
export const ANGULAR_JITTER_FRACTION = 0.3;

/** Minimum number of mobs to spawn. */
export const MIN_MOB_COUNT = 6;
/** Mobs-per-radius multiplier. */
export const MOB_COUNT_RADIUS_MULTIPLIER = 2;
/** Mob HP variance fraction of base HP. */
export const MOB_HP_VARIANCE_FRACTION = 0.5;
/** Number of traders to spawn. */
export const NUM_TRADERS = 3;
/** Trader moves per day. */
export const TRADER_MOVES_PER_DAY = 2;
/** Maximum ring-search depth for nearest-open-key fallback. */
export const MAX_SPAWN_SEARCH_RINGS = 100;
