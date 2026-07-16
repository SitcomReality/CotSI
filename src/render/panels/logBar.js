/**
 * logBar.js — Step 7 rewrite (ux7.md)
 *
 * Collapsible log bar at bottom of #game chrome frame.
 *
 * New log design:
 * - Collapsible bar (40px collapsed, ~160px expanded via .log-bar--open)
 * - Background: var(--vellum) with top border var(--hair) solid var(--rule)
 * - Log entries: var(--ink-soft) standard, var(--vermilion) combat/damage/death,
 *   var(--malachite) healing/gain
 * - Cloud-band pattern from /assets/icons/patterns/fog-clouds.svg as faint ::before
 *   decorative element when empty/collapsed ("scroll unrolled" hint)
 * - Collapse toggle: ink icon chevron button
 *
 * Styleguide compliance:
 * - No flat gray — empty state uses vellum-dark wash
 * - Semantic state colors for log line types
 * - Pattern use reserved for empty/collapsed state (tactile scroll metaphor)
 */

/**
 * Render the full log bar into #logMount.
 * The outer wrapper gets the toggle state from a CSS class on the mount,
 * managed by the collapse toggle binding in gameUIBindings.
 */
export function renderLog(state) {
  if (!state.logs || state.logs.length === 0) {
    return `
      <div class="log-bar">
        <div class="log-bar__toggle">
          <button class="log-bar__chevron" title="Toggle log" aria-label="Toggle event log">
            <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-chevron-up"/></svg>
          </button>
        </div>
        <div class="log-bar__entries log-bar__entries--empty">
          <span class="log-bar__hint">Scroll unrolled — no events yet</span>
        </div>
      </div>`;
  }

  const entries = state.logs
    .map((line) => {
      const cls = classifyLogLine(line);
      return `<div class="log-bar__line log-bar__line--${cls}">${escapeHtml(line)}</div>`;
    })
    .join('');

  return `
    <div class="log-bar">
      <div class="log-bar__toggle">
        <button class="log-bar__chevron" title="Toggle log" aria-label="Toggle event log">
          <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-chevron-up"/></svg>
        </button>
      </div>
      <div class="log-bar__entries">${entries}</div>
    </div>`;
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