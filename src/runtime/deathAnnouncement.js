/**
 * deathAnnouncement.js — Death announcement orchestration.
 *
 * Surfaced in refreshAll before the Herald's Prognosis so the player
 * sees a champion's death before anything else. References `G` via
 * live binding (circular import, used at runtime only).
 */
import { G } from '../game/state/liveGame.js';
import { registerAction } from '../shared/actionBus.js';
import { openDeathModal } from '../ui/modals/deathModal.js';
import { hideModal } from '../ui/modals/modalShell.js';
import { refreshAll } from './refreshAll.js';

/**
 * Show the pending death announcement, if any.
 * Returns true when a death was shown — callers must defer everything
 * else until acknowledgment. If no valid entries could be displayed
 * (e.g. the death was a mob, not a champion), clears the event and
 * returns false so the caller can continue.
 *
 * @param {Object} state
 * @returns {boolean}
 */
export function showDeathAnnouncement(state) {
  if (!state?.deathEvent) return false;

  const shown = openDeathModal(state.deathEvent, state.champions, state);
  if (!shown) {
    // No valid entries — clear the stale event so refreshAll can continue
    state.deathEvent = null;
    return false;
  }
  return true;
}

/**
 * Action-bus handler for [data-action="acknowledgeDeath"].
 * Clears the pending death announcement and re-enters refreshAll.
 */
registerAction('acknowledgeDeath', (el) => {
  if (el?.disabled) return;
  hideModal('deathModal');
  if (G) G.deathEvent = null;
  refreshAll();
});
