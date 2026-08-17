/**
 * optionRows.js — The per-option rows of an alternatives choice point:
 * preview radio, editable option id, draw weight, "add group inside option"
 * (the hinged-elbow pattern), and remove.
 */
import { S } from '../../../state.js';
import { el, numberInput } from '../../formControls/index.js';
import { activeParts } from '../../variantQuery.js';
import { freshId, motifScoped, listNodes, makeGroupNode, makeLeafNode } from '../../partTree/index.js';
import { renameNodeId } from '../../renameIds.js';
import { previewStateFor, setPinnedOption } from '../../previewState.js';
import { SHAPE_TYPES } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';

/** Select the first leaf shape from the registry for "add group inside option". */
const firstShape = () => Object.keys(SHAPE_TYPES)[0];

/**
 * One row per option: the preview radio (force this option in the preview),
 * the editable option id, the draw weight, the add-group-inside-option
 * button, and the remove button. Mutations go through ctx.mutate().
 *
 * The preview radios share a `name` with the "Natural (random)" radio in the
 * alternatives section head (alternatives/index.js) — together they are one
 * radio group, so choosing an option here un-checks Natural and vice-versa.
 * All writes route through setPinnedOption (previewState.js).
 * @param {object} node - the alternatives choice point
 * @param {object[]} options - node.alternatives
 * @param {string|null} motifId - the active motif's id (null outside motif decors)
 * @param {object} ctx - the panel mutation context
 */
export function renderOptionRows(container, node, options, motifId, ctx) {
  options.forEach((option, oi) => {
    const orow = el('div', 'alternative-row');
    const preview = el('input');
    preview.type = 'radio';
    preview.name = `preview-${node.id}`;
    const st = previewStateFor(S.previewOptions, node.id);
    preview.checked = st.mode === 'pinned' && st.optionId === option.id;
    preview.title = 'Force this option in the preview (node-scoped)';
    preview.addEventListener('change', () => {
      S.previewOptions = setPinnedOption(S.previewOptions, node.id, option.id);
      ctx.onEdit();
      ctx.renderAll();
    });
    orow.append(preview);

    // The option id is editable — option ids live in the GLOBAL part-id
    // namespace, so renames check the whole tree and rewrite the choice
    // point's `default` (renameNodeId) plus the session preview force.
    const optIdInput = el('input');
    optIdInput.type = 'text';
    optIdInput.className = 'part-label option-id-input';
    optIdInput.value = option.id;
    optIdInput.title = "Option id — global namespace; renames rewrite the choice point's default";
    optIdInput.addEventListener('change', () => {
      const clean = optIdInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
      if (!clean || clean === option.id) { optIdInput.value = option.id; return; }
      if (listNodes(activeParts()).some((e) => e.node.id === clean)) {
        window.alert(`Option id "${clean}" already exists — pick a different name.`);
        optIdInput.value = option.id;
        return;
      }
      ctx.mutate(() => {
        renameNodeId(activeParts(), option.id, clean);
        if (S.previewOptions.get(node.id) === option.id) {
          S.previewOptions = setPinnedOption(S.previewOptions, node.id, clean);
        }
      });
    });
    orow.append(optIdInput);

    const weight = numberInput(option.weight ?? 1, {
      min: 0, step: 0.05,
      onChange: (v) => ctx.mutate(() => { option.weight = v; }),
    });
    weight.title = 'Draw weight — 0 = never drawn (exclusion)';
    orow.append(weight);

    // Add group inside option — the hinged-elbow pattern.
    const addGroup = el('button', null, '＋ group');
    addGroup.type = 'button';
    addGroup.title = 'Add a group inside this option (hinged configs — the choice point has no transform)';
    addGroup.addEventListener('click', () => ctx.mutate(() => {
      const gid = freshId(activeParts(), motifScoped(`${option.id}-hinge`, motifId));
      const g = makeGroupNode(gid);
      g.children.push(makeLeafNode(firstShape(), freshId(activeParts(), motifScoped(`${option.id}-part`, motifId)), true));
      option.parts.push(g);
    }));
    orow.append(addGroup);

    const removeOpt = el('button', null, '✕');
    removeOpt.type = 'button';
    removeOpt.title = 'Remove this option';
    removeOpt.disabled = options.length === 1;
    removeOpt.addEventListener('click', () => ctx.mutate(() => {
      options.splice(oi, 1);
      if (node.default === option.id) node.default = options[0]?.id ?? undefined;
      // If the removed option was the one pinned in the preview, release the pin.
      const st = previewStateFor(S.previewOptions, node.id);
      if (st.mode === 'pinned' && st.optionId === option.id) {
        S.previewOptions = setPinnedOption(S.previewOptions, node.id, null);
      }
    }));
    orow.append(removeOpt);
    container.append(orow);
  });
}
