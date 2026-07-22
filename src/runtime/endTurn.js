/**
 * endTurn.js — Human turn-end orchestration.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp, setTurnLock, isTurnLocked } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { finishTurn } from '../game/state/worldSimulation.js';
import { isDigEligible } from '../game/state/turnActions.js';
import { openConfirmModal } from '../ui/modals/confirmModal.js';
import { getCombatUI } from '../ui/combat/combatUiState.js';

/**
 * Disable or re-enable the End Turn button with visual feedback.
 */
function disableEndTurnBtn(disabled) {
  const btn = document.querySelector('.left-endturn-btn');
  if (!btn) return;
  btn.disabled = disabled;
  if (disabled) {
    btn.textContent = 'Ending\u00A0Turn\u2026';
    btn.classList.add('is-ending');
  } else {
    btn.textContent = 'End Turn';
    btn.classList.remove('is-ending');
  }
}

/**
 * End the human player's turn.
 */
export function onEndTurn() {
  if (!G || G.dispatch) return;
  if (G.reward) return;  // must resolve reward (artifact draft) before ending turn
  if (isTurnLocked()) return;
  if (getCombatUI()) return; // combat is active — cannot end turn
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human') return;

  if (ch.moves > 0) {
    const msg = isDigEligible(G, ch)
      ? 'End turn here and dig for rewards?'
      : 'End turn with moves remaining?';
    openConfirmModal({ title: 'End Turn', message: msg })
      .then(confirmed => {
        if (confirmed) {
          setTurnLock(true);
          disableEndTurnBtn(true);
          finishTurn(G);
          refreshAll();
        }
      });
    return;
  }

  setTurnLock(true);
  disableEndTurnBtn(true);
  finishTurn(G);
  refreshAll();
}
