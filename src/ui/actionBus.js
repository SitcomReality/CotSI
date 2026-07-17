/** Central dispatch for all [data-action] clicks. */
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
