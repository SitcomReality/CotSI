/**
 * gameContext.js — Lightweight game-phase context tracker.
 *
 * Records what the game is doing right now so that per-frame profiling
 * annotations include the active phase, champion, action type, etc.
 *
 * Layer: dev/ — set/clear are called from runtime/ and ui/ orchestration.
 */

// ─── Context shape ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} GameContext
 * @property {string} phase — 'bot_turn' | 'combat' | 'human_turn' | 'animation' | 'idle'
 * @property {string} [championId]
 * @property {string} [championName]
 * @property {string} [controller] — 'human' | 'bot'
 * @property {string} [action] — 'deciding' | 'moving' | 'attacking' | 'idle' | 'animating'
 * @property {string} [detail] — optional extra info (e.g. faction name)
 */

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {GameContext|null} */
let _currentContext = null;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Set the current game context. Replaces the previous context entirely.
 * Pass an object with any subset of fields; omitted fields are cleared.
 * @param {GameContext} ctx
 */
export function setGameContext(ctx) {
  _currentContext = { ...ctx };
}

/**
 * Get a snapshot of the current game context.
 * @returns {GameContext|null}
 */
export function getGameContext() {
  return _currentContext;
}

/**
 * Clear the current game context.
 */
export function clearGameContext() {
  _currentContext = null;
}
