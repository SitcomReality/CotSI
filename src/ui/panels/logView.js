import { h } from '../utils/dom.js';

/**
 * Return an array of DOM nodes (or a single empty-state node) for the log.
 * Caller is responsible for appending them to the log container.
 */
export function buildLogEntries(logs) {
  if (!logs || logs.length === 0) {
    return [h('div', { class: 'log-view__empty' }, 'There is no history.')];
  }

  return logs.map((line) => {
    const cls = classifyLogLine(line);
    return h('div', { class: `log-view__line log-view__line--${cls}` }, line);
  });
}

/* ── Helpers ── */

/**
 * Classify a log line by its semantic content for color coding.
 * Returns one of: 'standard', 'combat', 'heal', 'system'
 */
function classifyLogLine(line) {
  const lower = line.toLowerCase();
  // Combat / damage / death keywords
  if (
    /\b(attacks?|strikes?|hits?|damage|killed?|destroyed?|defeated?|slain|wounds?|bleeds?|dies?|death)\b/.test(lower)
  ) {
    return 'combat';
  }
  // Healing / gain keywords
  if (
    /\b(heals?|restores?|recovers?|regenerates?|gains?|earns?|receives?)\b/.test(lower)
  ) {
    return 'heal';
  }
  // System / weather / turn events
  if (
    /\b(turn|weather|day|night|dawn|dusk|phase)\b/.test(lower)
  ) {
    return 'system';
  }
  return 'standard';
}

/**
 * Minimal HTML escaping for log lines.
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}