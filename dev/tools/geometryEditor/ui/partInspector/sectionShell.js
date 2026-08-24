/**
 * sectionShell.js — Collapsible `<details>` sections for the part inspector.
 *
 * The inspector's fields live in foldable sections (`SECTIONS` registry →
 * default open state) so the panel stays scannable. Which sections the user
 * has open is session state, tracked in `openSections` across re-renders.
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

/** Inspector sections: `key` → default open state. */
const SECTIONS = {
  shape:         { title: 'Shape',         open: false },
  position:      { title: 'Position',      open: false },
  rotation:      { title: 'Rotation',      open: false },
  scale:         { title: 'Part scale',    open: false },
  chance:        { title: 'Spawn chance',  open: false },
  bounds:        { title: 'Bounds',        open: false },
  color:         { title: 'Color & tint',  open: false },
  biomeScale:    { title: 'Biome size',    open: false },
  stretch:       { title: 'Stretch variation', open: false },
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
 *   for the collapsed header (e.g. "Y 0 · lift 0 · local (0.12, 0, 0.02)"),
 *   or `'default'` when all values are at schema defaults.
 */
function section(key, container, getSummary) {
  const det = el('details', 'inspector-section');
  det.open = openSections.has(key);

  const summary = el('summary', 'section-title', SECTIONS[key].title);
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

export { SECTIONS, openSections, section };

/**
 * A labeled super-group (Phase 3) wrapping related sections: a quiet
 * uppercase label + a 2px family accent bar (`data-group` drives the hue in
 * inspector.css — label, triangle and focus only, never field labels).
 * Sections append into the returned div instead of the panel root.
 *
 * @param {HTMLElement} container - Panel root to append the group to.
 * @param {string} key - Family key ('transform' | 'look' | 'spawn' | 'variation').
 * @param {string} label - Group label (e.g. 'Transform').
 */
export function sectionGroup(container, key, label) {
  const group = el('div', 'section-group');
  group.dataset.group = key;
  group.append(el('div', 'section-group-label', label));
  container.append(group);
  return group;
}
