/**
 * actionBus.js — Central dispatch for all [data-action] clicks and key shortcuts.
 * Leaf infrastructure: imports nothing project-local, so any layer may use it.
 * Action *registrations* that wire layers together live in runtime/.
 */

let handlers = {};

export function registerAction(action, fn) {
  if (handlers[action]) {
    console.warn(`[actionBus] Action '${action}' re-registered; overwriting previous handler.`);
  }
  handlers[action] = fn;
}

/**
 * Invoke a registered action handler programmatically (keyboard shortcuts,
 * non-DOM triggers). No-op when the action is not registered.
 * @param {string} action
 * @param {Element} [el]
 * @param {Event} [e]
 */
export function dispatchAction(action, el, e) {
  return handlers[action]?.(el, e);
}

// Listener setup is guarded so pure-layer tests can import this module in
// Node (no DOM). In the browser both guards are truthy.
if (typeof document !== 'undefined') document.addEventListener('click', (e) => {
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
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const map = { ' ': 'endTurn', 'c': 'centerChampion',
                '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', '_': 'zoomOut' };
  const action = map[e.key];
  if (action && handlers[action]) {
    e.preventDefault();
    handlers[action](null, e);
  }
});

/**
 * Store the getGameState reference so the closeReward handler (registered
 * in rewardModal.js) can clear G.reward on close.
 */
let _getGameState = null;

export function initModalActions(getGameState) {
  _getGameState = getGameState;
}

/**
 * Called by the closeReward handler in rewardModal.js to clear the game-state reward.
 */
export function clearGameReward() {
  if (_getGameState) {
    const state = _getGameState();
    if (state) state.reward = null;
  }
}
