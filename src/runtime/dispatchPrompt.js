/**
 * dispatchPrompt.js — Augur's Dispatch orchestration.
 * Chronological supremacy: while a dispatch is pending (G.dispatch), it is the
 * first and only interactive element of the turn — reward prompts, bot turns,
 * and map input all wait for the Acknowledge click.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G } from '../game/state/liveGame.js';
import { registerAction } from '../shared/actionBus.js';
import { openDispatchModal } from '../ui/modals/dispatchModal.js';
import { hideModal } from '../ui/modals/modalShell.js';
import { getSceneContext, centerCameraOnHex } from '../render/hexmap3d/hexMapRenderer.js';
import { refreshAll } from './refreshAll.js';

/**
 * Show the pending Augur's Dispatch, if any.
 * Safe to call on every refresh — a no-op when no dispatch is pending.
 *
 * @param {Object} state
 * @returns {boolean} true when a dispatch was shown — callers must defer
 * reward prompts and bot scheduling until acknowledgment.
 */
export function showPendingDispatch(state) {
  if (!state?.dispatch) return false;

  // Non-interactive prelude: bring the active champion on screen first, so
  // the dispatch effectively appears instantly over the right place.
  const champ = state.champions.find((c) => c.id === state.dispatch.championId);
  if (champ) {
    const ctx = getSceneContext();
    if (ctx) {
      centerCameraOnHex(ctx.getCameraState(), champ.pos.q, champ.pos.r);
      ctx.applyCamera();
    }
  }

  openDispatchModal(state.dispatch.report);
  return true;
}

/**
 * Action-bus handler for [data-action="acknowledgeDispatch"].
 * Clears the pending dispatch and re-enters refreshAll, which then surfaces
 * whatever was waiting (artifact draft, dig loot, bot turns).
 */
registerAction('acknowledgeDispatch', (el) => {
  if (el?.disabled) return; // reveal animation still running
  hideModal('dispatchModal');
  if (G) G.dispatch = null;
  refreshAll();
});
