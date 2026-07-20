/**
 * heraldPrompt.js — Herald's Prognosis orchestration.
 *
 * The herald appears at the start of each day before any champion's
 * Augur's Dispatch. It shows the weather and the day's turn order.
 *
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G } from '../game/state/liveGame.js';
import { registerAction } from '../shared/actionBus.js';
import { openHeraldModal } from '../ui/modals/heraldModal.js';
import { hideModal } from '../ui/modals/modalShell.js';
import { refreshAll } from './refreshAll.js';

/**
 * Show the pending Herald's Prognosis, if any.
 * Returns true when a herald was shown — callers must defer dispatch,
 * rewards, and bot scheduling until acknowledgment.
 *
 * @param {Object} state
 * @returns {boolean}
 */
export function showHeraldReport(state) {
  if (!state?.herald) return false;

  openHeraldModal(state.herald);
  return true;
}

/**
 * Action-bus handler for [data-action="acknowledgeHerald"].
 * Clears the pending herald and re-enters refreshAll, which then surfaces
 * whatever is waiting (dispatch, reward, bot turns).
 */
registerAction('acknowledgeHerald', (el) => {
  if (el?.disabled) return;
  hideModal('heraldModal');
  if (G) G.herald = null;
  refreshAll();
});
