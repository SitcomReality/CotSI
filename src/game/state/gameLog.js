/**
 * gameLog.js — Structured log entry system.
 *
 * Log entries now use a structured format with colored segments for rich
 * rendering in the main log bar, plus a plainText fallback for the
 * memory-efficient overflow text log.
 *
 * Layer: game/state/ (mutates G.logs)
 */

/**
 * Create a structured log entry.
 *
 * @param {string} plainText  — plain text version for the overflow log
 * @param {Array}  segments   — array of { text, color? } objects for rich rendering
 * @param {string} type       — 'combat' | 'heal' | 'system' | 'death' | 'day' | 'standard'
 * @param {Object} [flags]    — { isDeath?, isDayMarker? }
 * @returns {Object} structured log entry
 */
export function createLogEntry(plainText, segments, type = 'standard', flags = {}) {
  return {
    plainText,
    segments: segments.map(s =>
      typeof s === 'string' ? { text: s } : s
    ),
    type,
    isDeath: !!flags.isDeath,
    isDayMarker: !!flags.isDayMarker,
  };
}

/**
 * Add a log entry to game state.
 * Accepts either a plain string (backward-compat) or a structured entry.
 *
 * @param {Object} state       — live game state (G)
 * @param {string|Object} entry — plain text or structured log entry
 */
export function addLog(state, entry) {
  const structured = typeof entry === 'string'
    ? createLogEntry(entry, [{ text: entry }], 'standard')
    : entry;

  state.logs = [structured, ...state.logs].slice(0, 100);
}

/**
 * Convenience: add a structured log entry with segments.
 *
 * @param {Object} state
 * @param {string} plainText
 * @param {Array}  segments
 * @param {string} type
 * @param {Object} [flags]
 */
export function addLogEntry(state, plainText, segments, type = 'standard', flags = {}) {
  addLog(state, createLogEntry(plainText, segments, type, flags));
}
