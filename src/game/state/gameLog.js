/**
 * gameLog.js — Structured log entry system.
 *
 * Log entries use a consistent subject-verb-object-detail grammar (defined in
 * logGrammar.js) for rich rendering in the main log table, with plainText
 * auto-generated for the memory-efficient overflow text log.
 *
 * Layer: game/state/ (mutates G.logs)
 */

import { createLogEntry, LOG_CATEGORY } from '../rules/logGrammar.js';

/**
 * Add a log entry to game state.
 * Accepts a grammar object, a structured entry, or a plain string (backward-compat).
 *
 * @param {Object} state          — live game state (G)
 * @param {Object|string} entry   — grammar object, structured entry, or plain text
 */
export function addLog(state, entry) {
  let structured;

  if (typeof entry === 'string') {
    structured = createLogEntry({
      category: LOG_CATEGORY.SYSTEM,
      subject: { text: entry },
      verb: '',
      object: null,
      detail: null,
    });
    // Override plainText so the string is preserved verbatim
    structured.plainText = entry;
  } else if (entry.category && entry.subject) {
    // Grammar object: { category, subject, verb, object, detail }
    structured = createLogEntry(entry);
  } else {
    // Already a structured entry from createLogEntry
    structured = entry;
  }

  state.logs = [structured, ...state.logs].slice(0, 100);
}

/**
 * Add a structured log entry.
 *
 * Supports two overloads:
 *   1. Grammar:  addLogEntry(state, { category, subject, verb, object, detail })
 *   2. Legacy:   addLogEntry(state, plainText, segments, type, flags)
 *
 * @param {Object} state
 * @param {Object|string} arg1 — grammar object or plainText string
 * @param {Array}  [arg2]      — segments (legacy)
 * @param {string} [arg3]      — type (legacy)
 * @param {Object} [arg4]      — flags (legacy)
 */
export function addLogEntry(state, arg1, arg2, arg3, arg4) {
  if (typeof arg1 === 'object' && arg1 !== null && 'category' in arg1) {
    // New grammar overload
    addLog(state, createLogEntry(arg1));
  } else {
    // Legacy overload: (plainText, segments, type, flags)
    const entry = legacyCreateEntry(arg1, arg2, arg3, arg4);
    addLog(state, entry);
  }
}

/**
 * Legacy entry factory — preserved for old-style callers during migration.
 * Once all call sites use the grammar, this can be removed.
 *
 * @param {string} plainText
 * @param {Array}  segments
 * @param {string} type
 * @param {Object} flags
 * @returns {Object}
 */
function legacyCreateEntry(plainText, segments, type = 'standard', flags = {}) {
  return {
    plainText,
    segments: (segments || []).map(s =>
      typeof s === 'string' ? { text: s } : s
    ),
    type,
    isDeath: !!flags.isDeath,
    isDayMarker: !!flags.isDayMarker,
  };
}
