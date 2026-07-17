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
 * closeReward — hides the reward modal and clears any pending reward.
 * Registered here so it works without combat being imported.
 */
export function initModalActions(getGameState) {
  registerAction('closeReward', () => {
    const modal = document.getElementById('rewardModal');
    if (modal) modal.style.display = 'none';
    if (getGameState) {
      const state = getGameState();
      if (state) state.reward = null;
    }
  });
}
