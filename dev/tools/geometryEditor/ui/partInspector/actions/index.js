/**
 * actions/index.js — Part inspector header + structural tree actions.
 *
 * renderPartHeader renders the breadcrumb back to the object-level controls;
 * renderPartActions renders the editable id row plus the structural actions
 * every node gets (nest into a new group, move into/out of an existing group,
 * ungroup, copy a sibling's transform, convert to alternatives). Both write
 * S.selectedPartId through the ctx mutation flow. The barrel re-exports the
 * original actions module's public surface.
 */
import { renderPartHeader } from './header.js';
import { renderIdEdit } from './idEdit.js';
import { renderStructureActions } from './structureActions.js';

export { renderPartHeader } from './header.js';

/**
 * Structural actions for any node: the editable id row, then the actions
 * block (nest/move/ungroup/copy-transform/convert-to-alternatives).
 */
export function renderPartActions(container, entry, ctx) {
  renderIdEdit(container, entry, ctx);
  renderStructureActions(container, entry, ctx);
}
