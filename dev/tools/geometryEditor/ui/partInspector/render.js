/**
 * render.js — Part inspector composition: header, id row, and sections.
 *
 * renderPartInspector renders the selected part's fields into `container`.
 * `entry` is the parts-tree lookup ({ node, parent, depth, index, option }) —
 * groups get transform editing; leaves additionally get shape params, the
 * merged Color & tint, biome scale and stretch variation; `alternatives` choice points
 * get the option table (weights, default, seed, preview radios). The
 * structural tree actions (nest/move/ungroup/convert-to-alternatives) live in
 * the parts-list actions bar (ui/partList/actionsBar.js). `ctx` supplies the
 * mutation flow.
 */
import { isGroupNode, isAlternativesNode } from '../partTree/index.js';
import { renderPartHeader } from './actions/index.js';
import { renderIdEdit } from './actions/idEdit.js';
import { renderPositionSection, renderRotationSection, renderScaleSection } from './transform/index.js';
import { renderBoundsSection } from './boundsSection.js';
import { renderShapeSection, renderColorSection, renderBiomeScaleSection, renderStretchSection } from './leafSections/index.js';
import { sectionGroup } from './sectionShell.js';
import { renderAlternativesSection } from './alternatives/index.js';

/**
 * Render the selected part's fields into `container`. `entry` is the parts-tree
 * lookup ({ node, parent, depth, index }) — groups get structural actions and
 * transform editing; leaves additionally get shape params, the merged
 * Color & tint, biome scale and stretch variation. `ctx` supplies the mutation flow.
 */
export function renderPartInspector(container, entry, ctx) {
  const { node } = entry;
  renderPartHeader(container, node, ctx);
  renderIdEdit(container, entry, ctx);
  if (isAlternativesNode(node)) {
    renderAlternativesSection(container, node, entry, ctx);
    return; // choice points have no transform/color/geometry of their own
  }
  if (!isGroupNode(node)) {
    renderShapeSection(container, node, ctx);
  }
  const transform = sectionGroup(container, 'transform', 'Transform');
  renderPositionSection(transform, entry, ctx);
  renderRotationSection(transform, entry, ctx);
  renderScaleSection(transform, entry, ctx);
  renderBoundsSection(container, entry, ctx);
  if (!isGroupNode(node)) {
    const look = sectionGroup(container, 'look', 'Look');
    renderColorSection(look, node, ctx);
    const variation = sectionGroup(container, 'variation', 'Variation');
    renderBiomeScaleSection(variation, node, ctx);
    renderStretchSection(variation, node, ctx);
  }
}
