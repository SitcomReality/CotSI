/**
 * render.js — Part inspector composition: header, actions, and sections.
 *
 * renderPartInspector renders the selected part's fields into `container`.
 * `entry` is the parts-tree lookup ({ node, parent, depth, index }) — groups
 * get structural actions and transform editing; leaves additionally get shape
 * params, color, biome tint and stretch variation. `ctx` supplies the
 * mutation flow.
 */
import { isGroupNode } from '../partTree/index.js';
import { renderPartHeader, renderPartActions } from './actions.js';
import { renderPositionSection, renderRotationSection, renderScaleSection } from './transformSections.js';
import { renderBoundsSection } from './boundsSection.js';
import { renderShapeSection, renderColorSection, renderBiomeSection, renderStretchSection } from './leafSections.js';

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
