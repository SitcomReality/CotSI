/**
 * logGrammar.js — Structured log entry grammar.
 *
 * Defines a consistent subject-verb-object-detail grammar for all log events.
 * Every event follows the same structure, enabling column-aligned table rendering
 * and machine-parseable logs.
 *
 * Layer: game/rules/ — pure, no state mutation, no DOM.
 */

/** @enum {string} */
export const LOG_CATEGORY = Object.freeze({
  COMBAT:  'combat',
  HEAL:    'heal',
  ECONOMY: 'economy',
  DEATH:   'death',
  SYSTEM:  'system',
  MARKER:  'marker',
});

/**
 * Create a labelled text segment with optional colour.
 *
 * @param {string} text
 * @param {string} [color] — CSS var() expression, e.g. 'var(--gold)'
 * @returns {{ text: string, color?: string }}
 */
export function label(text, color) {
  return color ? { text, color } : { text };
}

/**
 * Create a structured log entry from grammar fields.
 * Plain text and legacy segments are auto-generated from the grammar.
 *
 * @param {Object} opts
 * @param {string} opts.category   — one of LOG_CATEGORY values
 * @param {{ text: string, color?: string }} opts.subject
 * @param {string} opts.verb
 * @param {{ text: string, color?: string } | null} [opts.object]
 * @param {{ text: string, color?: string } | null} [opts.detail]
 * @returns {Object} structured log entry
 */
export function createLogEntry({ category, subject, verb, object, detail }) {
  // Build plain text from grammar fields (skip empty strings)
  const parts = [subject.text, verb].filter(Boolean);
  if (object) parts.push(object.text);
  if (detail) parts.push(detail.text);
  const plainText = parts.join(' ');

  // Build legacy segments array for backward compat
  const segments = [];
  segments.push({ text: subject.text, color: subject.color });
  segments.push({ text: ` ${verb} ` });
  if (object) {
    segments.push({ text: object.text, color: object.color });
    segments.push({ text: ' ' });
  }
  if (detail) {
    segments.push({ text: detail.text, color: detail.color });
  }

  return {
    plainText,
    category,
    grammar: { subject, verb, object, detail },
    segments,
    // Legacy flags — kept for renderer that checks them
    isDeath: category === LOG_CATEGORY.DEATH,
    isDayMarker: category === LOG_CATEGORY.MARKER,
  };
}
