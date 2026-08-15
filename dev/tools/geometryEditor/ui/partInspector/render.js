/**
 * render.js — Part inspector composition: header, actions, and sections.
 *
 * renderPartInspector renders the selected part's fields into `container`.
 * `entry` is the parts-tree lookup ({ node, parent, depth, index, option }) —
 * groups get structural actions and transform editing; leaves additionally get
 * shape params, color, biome tint and stretch variation; `alternatives` choice
 * points get the option table (weights, default, seed, preview radios). `ctx`
 * supplies the mutation flow.
 */
import { isGroupNode, isAlternativesNode } from '../partTree/index.js';
import { renderPartHeader, renderPartActions } from './actions.js';
import { renderPositionSection, renderRotationSection, renderScaleSection } from './transformSections.js';
import { renderBoundsSection } from './boundsSection.js';
import { renderShapeSection, renderColorSection, renderBiomeSection, renderStretchSection } from './leafSections.js';
import { renderAlternativesSection } from './alternativesSection.js';

/**
 * Render the selected part's fields into `container`. `entry` is the parts-tree
 * lookup ({ node, parent, depth, index }) — groups get structural actions and
 * transform editing; leaves additionally get shape params, color, biome tint
 * and stretch variation. `ctx` supplies the mutation flow.
 */
export function renderPartInspector(container, entry, ctx) {
  const { node } = entry;
  renderPartHeader(container, node, ctx);
  renderPartActions(container, entry, ctx);
  if (isAlternativesNode(node)) {
    renderAlternativesSection(container, node, entry, ctx);
    return; // choice points have no transform/color/geometry of their own
  }
  if (!isGroupNode(node)) {
    renderShapeSection(container, node, ctx);
  }
  renderPositionSection(container, entry, ctx);
  renderRotationSection(container, entry, ctx);
  renderScaleSection(container, entry, ctx);
  renderBoundsSection(container, entry, ctx);
  if (!isGroupNode(node)) {
    renderColorSection(container, node, ctx);
    renderBiomeSection(container, node, ctx);
    renderStretchSection(container, node, ctx);
  }
}
