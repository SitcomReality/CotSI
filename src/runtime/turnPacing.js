/**
 * turnPacing.js — Turn-visibility pacing.
 *
 * Guarantees every turn (especially bot turns) is visible on screen for at
 * least MIN_BOT_TURN_MS. refreshAll records the moment the active champion
 * changes; runBot waits out the remainder before acting, so a bot that
 * instantly ends its turn doesn't strobe through the turn order.
 */
import { MIN_BOT_TURN_MS } from '../params/ui/uiParams.js';

let _activeChampId = null;
let _turnStartMs = 0;

/**
 * Record the moment the active champion changed.
 * Idempotent per champion — only re-stamps the clock when the id changes.
 * Called on every refreshAll (cheap no-op otherwise).
 *
 * @param {Object|null} G — live game state (or null during setup).
 */
export function noteTurnStart(G) {
  const id = G?.activeChampionId ?? null;
  if (id === _activeChampId) return;
  _activeChampId = id;
  _turnStartMs = performance.now();
}

/**
 * Milliseconds remaining until the current turn has been visible for the
 * minimum dwell. Returns 0 once the minimum is met.
 *
 * @returns {number}
 */
export function botTurnDwellMs() {
  return Math.max(0, MIN_BOT_TURN_MS - (performance.now() - _turnStartMs));
}
