/**
 * actions.js — Part inspector header + structural tree actions.
 *
 * renderPartHeader renders the breadcrumb back to the object-level controls;
 * renderPartActions renders the structural actions every node gets: nest into
 * a new group, move into/out of an existing group, ungroup, and copy the
 * transform from a sibling. Both write `S.selectedPartId` through the ctx
 * mutation flow.
 */
import { S } from '../../state.js';
import { el, selectInput } from '../formControls.js';
import { inspectorHead } from '../inspectorHead.js';
import { activeParts } from '../variantQuery.js';
import {
  isGroupNode,
  findNodeById,
  siblingIds,
  nestNode,
  ungroupNode,
  canUngroup,
  groupTargets,
  moveIntoGroup,
  canExtract,
  extractNode,
} from '../partTree/index.js';

/** Inspector header for part editing: breadcrumb back to the object. */
function renderPartHeader(container, node, ctx) {
  const d = S.descriptor;
  const back = el('button', 'breadcrumb', `← ${d.displayName}`);
  back.type = 'button';
  back.title = 'Back to object-level controls';
  back.addEventListener('click', () => {
    S.selectedPartId = null;
    ctx.renderAll();
  });
  const title = isGroupNode(node) ? `${node.id} · group` : `${node.id} · ${node.shape}`;
  container.append(inspectorHead(title, null, back));
}

/**
 * Structural actions for any node: nest into a new group, move into an
 * existing group, move out of the current group (nested nodes), ungroup
 * (groups only, when the fold is exact), and copy the transform from a
 * sibling.
 */
function renderPartActions(container, entry, ctx) {
  const { node } = entry;
  const actions = el('div', 'part-actions');

  const nestBtn = el('button', null, 'Nest into group');
  nestBtn.type = 'button';
  nestBtn.title = 'Wrap this part in a fresh group — its position is preserved';
  nestBtn.addEventListener('click', () => ctx.mutate(() => {
    const group = nestNode(activeParts(), entry);
    S.selectedPartId = group.id;
  }));
  actions.append(nestBtn);

  // Move into an existing group — position is preserved (frame conversion).
  const targets = groupTargets(activeParts(), entry);
  const moveSelect = selectInput(
    [{ value: '', label: '— move into group…' }, ...targets.map((g) => ({ value: g.id, label: `${g.id} · group` }))],
    '',
    (v) => {
      if (!v) return;
      ctx.mutate(() => {
        const target = findNodeById(activeParts(), v).node;
        moveIntoGroup(activeParts(), entry, target);
        S.selectedPartId = node.id; // the node keeps its id — stay on it
      });
    },
  );
  moveSelect.disabled = targets.length === 0;
  actions.append(moveSelect);

  // Move out of the current group — nested nodes only, exact when the group
  // is unscaled. The node lands beside its group in the group's parent list.
  if (entry.parent !== null) {
    const outBtn = el('button', null, 'Move out of group');
    outBtn.type = 'button';
    outBtn.title = 'Move this part out of its group to sit beside it — the group\'s transform folds in';
    outBtn.disabled = !canExtract(entry);
    outBtn.addEventListener('click', () => ctx.mutate(() => {
      extractNode(activeParts(), entry);
      S.selectedPartId = node.id;
    }));
    actions.append(outBtn);
  }

  if (isGroupNode(node)) {
    const ungroupBtn = el('button', null, 'Ungroup');
    ungroupBtn.type = 'button';
    ungroupBtn.title = 'Replace this group with its children, folding the transform into each';
    ungroupBtn.disabled = !canUngroup(node);
    ungroupBtn.addEventListener('click', () => ctx.mutate(() => {
      const promoted = ungroupNode(activeParts(), entry);
      S.selectedPartId = promoted[0].id;
    }));
    actions.append(ungroupBtn);
  }

  // Copy transform: adopt a sibling's transform wholesale. Root-only fields
  // (y / lift / tiltAxis / tilt) don't exist on nested nodes, so a nested
  // source simply lacks them — the copy leaves whatever the target had.
  const ids = siblingIds(activeParts(), entry);
  const copySelect = selectInput(
    [{ value: '', label: '— copy transform from…' }, ...ids],
    '',
    (v) => {
      if (!v) return;
      ctx.mutate(() => {
        const src = findNodeById(activeParts(), v).node.transform ?? {};
        const t = node.transform ?? (node.transform = {});
        const target = {};
        for (const key of ['localPos', 'localAxis', 'tiltAxis']) {
          if (src[key]) target[key] = { ...src[key] };
        }
        for (const key of ['rotY', 'scaleX', 'scaleY', 'scaleZ']) {
          if (src[key] !== undefined) target[key] = src[key];
        }
        if (entry.parent === null) {
          for (const key of ['y', 'lift', 'tilt']) {
            if (src[key] !== undefined) target[key] = src[key];
          }
        }
        Object.assign(t, target);
      });
    },
  );
  copySelect.disabled = ids.length === 0;
  actions.append(copySelect);

  container.append(actions);
}

export { renderPartHeader, renderPartActions };
