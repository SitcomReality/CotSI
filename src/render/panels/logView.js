/**
 * logView.js — Pure view layer for log entries.
 *
 * Responsible only for generating the inner HTML of log entry lines.
 * Knows nothing about collapsible bars, outer wrappers, or panel layout.
 * Can be reused by any container that wants to display logs.
 *
 * Styleguide compliance:
 * - Semantic color classes: --combat, --heal, --system, --standard
 * - Empty state uses vellum-dark wash (no flat gray)
 */

/**
 * Return HTML string of log entry <div>s for use in any container.
 * @param {string[]} logs - array of log lines (newest first)
 * @returns {string} HTML for the log entries (or empty-state message)
 */
export function renderLogEntries(logs) {
  if (!logs || logs.length === 0) {
    return `<div class="log-view__empty">There is no history.</div>`;
  }

  return logs
    .map((line) => {
      const cls = classifyLogLine(line);
      return `<div class="log-view__line log-view__line--${cls}">${escapeHtml(line)}</div>`;
    })
    .join('');
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