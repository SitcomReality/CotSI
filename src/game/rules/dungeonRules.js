/**
 * dungeonRules.js — Pure dungeon rules (placement math, re-entry timing).
 * Game-specific logic only; state mutations live in game/state/dungeonSystem.js.
 */
import { DUNGEON_COUNT_DIVISOR, DUNGEON_REENTRY_DELAY_DAYS } from '../../params/game/dungeonParams.js';

/**
 * How many dungeons a map of the given radius holds:
 * always at least 1, +1 for each additional full divisor of radius
 * (count = 1 + floor(radius / 22): 0–21 → 1, 22–43 → 2, 44–65 → 3, …).
 * @param {number} radius - Map radius in hexes
 * @returns {number}
 */
export function dungeonCountForRadius(radius) {
  return 1 + Math.floor(Math.max(0, radius) / DUNGEON_COUNT_DIVISOR);
}

/**
 * The first day a champion may re-enter a dungeon they fled on `fleeDay`:
 * one full day must pass, so re-entry is allowed from fleeDay + delay.
 * (Flee on day D → blocked on D+1 → may re-enter on D+2.)
 * @param {number} fleeDay
 * @returns {number}
 */
export function dungeonReentryDay(fleeDay) {
  return fleeDay + DUNGEON_REENTRY_DELAY_DAYS;
}
