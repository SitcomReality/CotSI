/**
 * idEdit.js — The selected node's editable id row. Renames stay unique within
 * the tree being edited, rewrite the owning choice point's `default` when the
 * node is an option (renameNodeId), and remap the session preview-option key
 * when it is a choice point.
 */
import { S } from '../../../state.js';
import { el, row } from '../../formControls.js';
import { activeParts } from '../../variantQuery.js';
import { listNodes } from '../../partTree/index.js';
import { renameNodeId } from '../../renameIds.js';

/** The ID input row for the selected node (sanitized to the schema id pattern). */
export function renderIdEdit(container, entry, ctx) {
  const { node } = entry;

  const idInput = el('input');
  idInput.type = 'text';
  idInput.value = node.id;
  idInput.title = 'Part id — unique within this parts tree';
  idInput.addEventListener('change', () => {
    const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
    if (!clean || clean === node.id) { idInput.value = node.id; return; }
    if (listNodes(activeParts()).some((e) => e.node.id === clean)) {
      window.alert(`Part id "${clean}" already exists in this tree — pick a different name.`);
      idInput.value = node.id;
      return;
    }
    ctx.mutate(() => {
      renameNodeId(activeParts(), node.id, clean);
      S.selectedPartId = clean;
      if (S.previewOptions.has(node.id)) {
        const forced = S.previewOptions.get(node.id);
        S.previewOptions = new Map(S.previewOptions);
        S.previewOptions.delete(node.id);
        S.previewOptions.set(clean, forced);
      }
    });
  });
  container.append(row('ID', idInput));
}
