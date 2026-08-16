/**
 * actionsBar.js — The selected part's structure actions, rendered as a bar
 * directly under the parts list (inside the #select-panel, next to the tree
 * they edit — NOT the Fields sidebar, where the button/select pile-up made
 * them unusable). Hidden until a part is selected.
 */
import { S } from '../../state.js';
import { el } from '../formControls/index.js';
import { activeParts } from '../variantQuery.js';
import { findNodeById, isGroupNode, isAlternativesNode } from '../partTree/index.js';
import { renderStructureActions } from '../partInspector/actions/structureActions.js';

/** Short kind label for the bar title (matches the parts-list rows). */
function kindLabel(node) {
  if (isAlternativesNode(node)) return 'alternatives';
  if (isGroupNode(node)) return 'group';
  return node.shape;
}

/**
 * Render the selected part's structure actions into `container` (a bar under
 * the parts list). Renders nothing when no part is selected.
 */
export function renderPartActionsBar(container, ctx) {
  container.textContent = '';
  const entry = findNodeById(activeParts(), S.selectedPartId);
  container.hidden = !entry;
  if (!entry) return;

  const head = el('div', 'parts-head');
  head.append(el('span', 'parts-title', `${entry.node.id} · ${kindLabel(entry.node)}`));
  container.append(head);
  renderStructureActions(container, entry, ctx);
}
