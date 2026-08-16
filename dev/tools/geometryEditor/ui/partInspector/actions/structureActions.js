/**
 * structureActions.js — The structural tree actions every node gets: convert
 * to alternatives, nest into a new group, move into/out of an existing group,
 * ungroup, and copy the transform from a sibling. All write S.selectedPartId
 * through the ctx mutation flow.
 */
import { S } from '../../../state.js';
import { el, selectInput } from '../../formControls.js';
import { activeParts, activeMotif } from '../../variantQuery.js';
import {
  isGroupNode,
  isAlternativesNode,
  findNodeById,
  siblingIds,
  siblingList,
  listNodes,
  nestNode,
  ungroupNode,
  canUngroup,
  groupTargets,
  moveIntoGroup,
  canExtract,
  extractNode,
  freshId,
  motifScoped,
  makeAlternativesNode,
} from '../../partTree/index.js';

/** Seeds already used by alternatives nodes in the active tree. */
function takenSeeds() {
  const seeds = new Set();
  for (const entry of listNodesOf(activeParts())) {
    if (entry.node.seed !== undefined) seeds.add(entry.node.seed);
  }
  return seeds;
}

/** Flat node list (walk.js listNodes isn't re-exported — scan inline). */
function listNodesOf(parts) {
  const out = [];
  const walk = (list, parent, depth) => {
    list.forEach((node, index) => {
      out.push({ node, parent, depth, index });
      if (Array.isArray(node.alternatives)) {
        for (const opt of node.alternatives) walk(opt.parts ?? [], node, depth + 1);
      } else if (Array.isArray(node.children)) {
        walk(node.children, node, depth + 1);
      }
    });
  };
  walk(parts, null, 0);
  return out;
}

/**
 * The structural actions block: convert to alternatives, nest into a new
 * group, move into an existing group, move out of the current group (nested
 * nodes), ungroup (groups only, when the fold is exact), and copy the
 * transform from a sibling.
 */
export function renderStructureActions(container, entry, ctx) {
  const { node } = entry;
  const actions = el('div', 'part-actions');

  // Convert selection to alternatives: wrap the node in a choice point with
  // one option holding a copy of it (decorComposition.md §6.2). The node's id
  // becomes the choice point's id (fresh), and the option keeps a renamed copy
  // of the wrapped node so its parts are editable per-config.
  if (!isAlternativesNode(node)) {
    const toAltBtn = el('button', null, 'Convert to alternatives');
    toAltBtn.type = 'button';
    toAltBtn.title = 'Wrap this part in a choice point with one option — add more options to vary its config';
    toAltBtn.addEventListener('click', () => ctx.mutate(() => {
      const siblings = siblingList(activeParts(), entry);
      const motifId = activeMotif()?.id; // scope storage ids under the motif (§6.2)
      const choiceId = freshId(activeParts(), motifScoped(`${node.id}-choice`, motifId));
      const copy = JSON.parse(JSON.stringify(node));
      copy.id = freshId(activeParts(), motifScoped(`${node.id}-config`, motifId));
      const choice = makeAlternativesNode(choiceId, [copy], takenSeeds());
      siblings.splice(entry.index, 1, choice);
      S.selectedPartId = choice.id;
    }));
    actions.append(toAltBtn);
  }

  const nestBtn = el('button', null, 'Nest into group');
  nestBtn.type = 'button';
  nestBtn.title = 'Wrap this part in a fresh group — its position is preserved';
  nestBtn.addEventListener('click', () => ctx.mutate(() => {
    const group = nestNode(activeParts(), entry, activeMotif()?.id);
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
