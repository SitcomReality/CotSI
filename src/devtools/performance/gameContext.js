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

/** @type {GameContext} */
let _currentContext = { phase: 'unknown', detail: 'initial' };

/** @type {GameContext|null} Last context set before the most recent clear */
let _lastNonCleared = null;

function _defaultContext() {
  return { phase: 'unknown', detail: 'default' };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Set the current game context. Replaces the previous context entirely.
 * Pass an object with any subset of fields; omitted fields are cleared.
 * Saves the context as the last non-cleared value for stale fallback.
 * @param {GameContext} ctx
 */
export function setGameContext(ctx) {
  _currentContext = { ...ctx };
  _lastNonCleared = { ...ctx };
}

/**
 * Get a snapshot of the current game context. Never returns null.
 *
 * When the current context is the cleared sentinel, returns the last
 * non-cleared context with detail set to 'stale' so profiler frames
 * between game-phase transitions still carry a meaningful label.
 * @returns {GameContext}
 */
export function getGameContext() {
  if (_currentContext && _currentContext.detail === 'cleared' && _lastNonCleared) {
    return { ..._lastNonCleared, detail: 'stale' };
  }
  return _currentContext || _defaultContext();
}

/**
 * Clear the current game context. Sets to a known 'unknown' phase
 * rather than null, so profiler frames always have a label.
 * The previous context is saved for stale-fallback in getGameContext().
 */
export function clearGameContext() {
  _currentContext = { phase: 'unknown', detail: 'cleared' };
}
