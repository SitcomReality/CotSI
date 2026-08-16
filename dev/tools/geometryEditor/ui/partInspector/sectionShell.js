/**
 * sectionShell.js — Collapsible `<details>` sections for the part inspector.
 *
 * The inspector's fields live in foldable sections (`SECTIONS` registry →
 * default open state) so the panel stays scannable. Which sections the user
 * has open is session state, tracked in `openSections` across re-renders.
 */
import { el } from '../formControls/index.js';

/** Inspector sections: `key` → default open state. */
const SECTIONS = {
  shape: { title: 'Shape', open: true },
  position: { title: 'Position', open: true },
  rotation: { title: 'Rotation', open: true },
  scale: { title: 'Scale', open: false },
  bounds: { title: 'Bounds', open: true },
  color: { title: 'Color', open: false },
  biome: { title: 'Biome tint', open: false },
  biomeScale: { title: 'Biome scale', open: false },
  stretch: { title: 'Stretch variation', open: false },
};
/** Which sections the user has open (session state, persisted across renders). */
const openSections = new Set(
  Object.entries(SECTIONS).filter(([, s]) => s.open).map(([key]) => key),
);

/**
 * A collapsible `<details>` section appended to `container`; its open state is
 * tracked in `openSections` so re-renders keep the user's layout.
 */
function section(key, container) {
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

export { SECTIONS, openSections, section };
