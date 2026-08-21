/**
 * actionsBar.js — The selected part's structure actions, rendered as a verb
 * dock directly under the parts list (inside the #select-panel, next to the
 * tree they edit — NOT the Fields sidebar, where the button/select pile-up
 * made them unusable). Hidden until a part is selected.
 */
import { S } from '../../state.js';
import { activeParts } from '../variantQuery.js';
import { findNodeById } from '../partTree/index.js';
import { renderStructureActions } from '../partInspector/actions/structureActions.js';

/**
 * Render the selected part's structure actions into `container` (a verb dock
 * under the parts list). No titled head — the selection is already named by
 * the highlighted tree row and the Fields-panel header; the dock's left
 * accent rule (parts.css) marks it as "actions for the selection". Renders
 * nothing when no part is selected.
 */
export function renderPartActionsBar(container, ctx) {
  container.textContent = '';
  const entry = findNodeById(activeParts(), S.selectedPartId);
  container.hidden = !entry;
  if (!entry) return;
  renderStructureActions(container, entry, ctx);
}
