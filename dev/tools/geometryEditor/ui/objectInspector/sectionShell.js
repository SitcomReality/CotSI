/**
 * sectionShell.js — Collapsible `<details>` sections for the object inspector.
 *
 * The object-level fields live in foldable sections (the same pattern
 * partInspector/sectionShell.js uses for part fields), so the design fields
 * stay scannable — the long per-biome pin list folds away by default.
 * Which sections the user has open is session state, kept across re-renders.
 *
 * Phase A: all sections start collapsed; each collapsed section shows a
 * one-line summary (via the optional `getSummary` callback) and a cerulean
 * dot when any value differs from the schema default.
 */
import { el } from '../formControls/index.js';

/** Format a number to 2–3 significant figures — no `1.4444444`. */
export function fmt(n) {
  return parseFloat(n.toPrecision(3)).toString();
}

/** Section registry: `key` → title + default open state. */
const SECTIONS = {
  motifs:      { title: 'Motifs',        open: false },
  variant:     { title: 'Variant',       open: false },
  biomePins:   { title: 'Per-biome variants', open: false },
  cluster:     { title: 'Cluster',       open: false },
  size:        { title: 'Spawn size',    open: false },
  placement:   { title: 'Placement',     open: false },
  emphasis:    { title: 'Emphasis',      open: false },
  variation:   { title: 'Variation',     open: false },
  portrait:    { title: 'Portrait',      open: false },
  item:        { title: 'Item',          open: false },
  entity:      { title: 'Entity',        open: false },
};
/** Which sections the user has open (session state, persisted across renders). */
const openSections = new Set(
  Object.entries(SECTIONS).filter(([, s]) => s.open).map(([key]) => key),
);

/**
 * A collapsible `<details>` section appended to `container`; its open state is
 * tracked in `openSections` so re-renders keep the user's layout.
 *
 * @param {string} key - Section key (must exist in SECTIONS).
 * @param {HTMLElement} container - Parent element to append to.
 * @param {Function} [getSummary] - Optional callback returning a summary string
 *   for the collapsed header, or `'default'` when all values are at schema defaults.
 */
export function section(key, container, getSummary) {
  const spec = SECTIONS[key];
  if (!spec) {
    throw new Error(`section(): no registry entry for "${key}" — add it to SECTIONS in sectionShell.js`);
  }
  const det = el('details', 'inspector-section');
  det.open = openSections.has(key);

  const summary = el('summary', 'section-title', spec.title);
  const dot = el('span', 'section-dot');
  const summarySpan = el('span', 'section-summary');

  summary.prepend(dot);
  summary.append(summarySpan);

  function updateSummary() {
    const text = getSummary ? getSummary() : '';
    const dotVisible = !det.open && text && text !== 'default';
    summarySpan.textContent = text;
    dot.hidden = !dotVisible;
    summarySpan.hidden = det.open;
    det.toggleAttribute('data-default', text === 'default');
  }

  det.addEventListener('toggle', () => {
    if (det.open) openSections.add(key);
    else openSections.delete(key);
    updateSummary();
  });

  det.append(summary);
  container.append(det);
  updateSummary();
  return det;
}

/**
 * A labeled super-group (Phase 3) wrapping related sections: a quiet
 * uppercase label + a 2px family accent bar (`data-group` drives the hue in
 * inspector.css — label, triangle and focus only, never field labels).
 * Sections append into the returned div instead of the panel root.
 *
 * @param {HTMLElement} container - Panel root to append the group to.
 * @param {string} key - Family key ('transform' | 'look' | 'spawn' | 'variation').
 * @param {string} label - Group label (e.g. 'Spawn').
 */
export function sectionGroup(container, key, label) {
  const group = el('div', 'section-group');
  group.dataset.group = key;
  group.append(el('div', 'section-group-label', label));
  container.append(group);
  return group;
}
