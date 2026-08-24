/**
 * dungeonParams.js — Dungeon parameters.
 *
 * Deliberately un-tuned placeholders: dungeon battles and the completion
 * reward get a balance pass once mob power is reworked (tracked in
 * dev/docs/futureWork.md). The numbers here are functional, not final.
 */

/** Map-radius → dungeon-count divisor: count = 1 + floor(radius / DIVISOR). */
export const DUNGEON_COUNT_DIVISOR = 22;

/**
 * Per-dungeon-day battle scaling (day = battle number, 1..3).
 *   hpMult       — multiplier applied to the rolled mob's hp and maxHp.
 *   potencyBonus — flat potency added to the mob's own faction.
 */
export const DUNGEON_BATTLE_SCALE = {
  1: { hpMult: 1.0, potencyBonus: 0 },
  2: { hpMult: 1.3, potencyBonus: 1 },
  3: { hpMult: 1.6, potencyBonus: 2 },
};

/**
 * Days a champion must wait before re-entering a dungeon they fled:
 * flee on day D → blocked on day D+1 → may re-enter on day D+DUNGEON_REENTRY_DELAY_DAYS.
 */
export const DUNGEON_REENTRY_DELAY_DAYS = 2;

/** Completion reward (winning the day-3 battle), granted once per run. */
export const DUNGEON_COMPLETION_GOLD = 60;
export const DUNGEON_COMPLETION_RELIC = 2;
export const DUNGEON_COMPLETION_KNOTS = 4;
/** Knots granted when the completion bonus choice picks knots over an item. */
export const DUNGEON_COMPLETION_BONUS_KNOTS = 2;

// ── Placement tuning ──────────────────────────────────────────────────────────

/** Minimum hex distance of a dungeon from the map center. */
export const DUNGEON_MIN_CENTER_DIST_FLOOR = 3;
/** Fraction of radius added to the floor (minCenterDist = max(floor, radius * fraction)). */
export const DUNGEON_MIN_CENTER_DIST_FRACTION = 0.35;
/** Edge margin: dungeons stay at least this many hexes inside the map rim. */
export const DUNGEON_EDGE_MARGIN = 2;
/** Minimum hex spacing between two dungeons (floor). */
export const DUNGEON_MIN_SPACING_FLOOR = 5;
/** Fraction of radius used for dungeon-to-dungeon spacing. */
export const DUNGEON_MIN_SPACING_FRACTION = 0.5;
