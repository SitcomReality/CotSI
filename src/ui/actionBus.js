/** Central dispatch for all [data-action] clicks. */
import { getSceneContext, zoomCamera, resetCamera, centerCameraOnHex } from '../render/hexmap3d/hexmap3d-index.js';
import { refreshZoomDisplay } from './mapView.js';
import { currentChamp } from '../game/session/liveGame.js';

let handlers = {};

export function registerAction(action, fn) {
  if (handlers[action]) {
    console.warn(`[actionBus] Action '${action}' re-registered; overwriting previous handler.`);
  }
  handlers[action] = fn;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (handlers[action]) {
    handlers[action](el, e);
  } else {
    console.warn(`[actionBus] No handler registered for action '${action}'.`);
  }
});

// Keyboard shortcuts (optional, will be added later)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const map = { ' ': 'endTurn', 'c': 'centerChampion', 'r': 'resetCamera',
                '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', '_': 'zoomOut' };
  const action = map[e.key];
  if (action && handlers[action]) {
    e.preventDefault();
    handlers[action](null, e);
  }
});

/* =====================================================================
   Map control action registrations
   ===================================================================== */

registerAction('zoomIn', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 0.8);
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('zoomOut', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 1.25);
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('resetCamera', () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  resetCamera(ctx.getCameraState());
  ctx.applyCamera();
  refreshZoomDisplay();
});

registerAction('centerChampion', () => {
  const ch = currentChamp();
  if (!ch) return;
  const ctx = getSceneContext();
  if (!ctx) return;
  centerCameraOnHex(ctx.getCameraState(), ch.pos.q, ch.pos.r);
  ctx.applyCamera();
  refreshZoomDisplay();
});

/* =====================================================================
   Global modal action registrations
   ===================================================================== */

/**
 * Store the getGameState reference so the closeReward handler (registered
 * in modal.js to avoid circular imports) can clear G.reward on close.
 */
let _getGameState = null;

export function initModalActions(getGameState) {
  _getGameState = getGameState;
}

/**
 * Called by the closeReward handler in modal.js to clear the game-state reward.
 */
export function clearGameReward() {
  if (_getGameState) {
    const state = _getGameState();
    if (state) state.reward = null;
  }
}
