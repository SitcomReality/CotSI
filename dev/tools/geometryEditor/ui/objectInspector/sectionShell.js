/**
 * sectionShell.js — Collapsible `<details>` sections for the object inspector.
 *
 * The object-level fields live in foldable sections (the same pattern
 * partInspector/sectionShell.js uses for part fields), so the design fields
 * stay scannable — the long per-biome pin list folds away by default.
 * Which sections the user has open is session state, kept across re-renders.
 */
import { el } from '../formControls.js';

/** Section registry: `key` → title + default open state. */
const SECTIONS = {
  motifs: { title: 'Motifs', open: true },
  variant: { title: 'Variant', open: true },
  biomePins: { title: 'Per-biome variants', open: false },
  cluster: { title: 'Cluster', open: true },
  size: { title: 'Size', open: true },
  placement: { title: 'Placement', open: true },
  emphasis: { title: 'Emphasis', open: true },
  portrait: { title: 'Portrait', open: false },
  item: { title: 'Item', open: true },
  entity: { title: 'Entity', open: true },
};
/** Which sections the user has open (session state, persisted across renders). */
const openSections = new Set(
  Object.entries(SECTIONS).filter(([, s]) => s.open).map(([key]) => key),
);

/**
 * A collapsible `<details>` section appended to `container`; its open state is
 * tracked in `openSections` so re-renders keep the user's layout.
 */
export function section(key, container) {
  const det = el('details', 'inspector-section');
  det.open = openSections.has(key);
  det.addEventListener('toggle', () => {
    if (det.open) openSections.add(key);
    else openSections.delete(key);
  });
  det.append(el('summary', 'section-title', SECTIONS[key].title));
  container.append(det);
  return det;
}
