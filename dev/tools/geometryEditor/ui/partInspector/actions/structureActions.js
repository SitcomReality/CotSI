/**
 * structureActions.js — The structural tree actions every node gets: convert
 * to alternatives, nest into a new group, move into/out of an existing group
 * or alternatives option, ungroup, and copy the transform from a sibling. All
 * write S.selectedPartId through the ctx mutation flow.
 *
 * Rendered by the parts-list actions bar (ui/partList/actionsBar.js) — the
 * buttons live with the tree they edit, not in the Fields sidebar.
 */
import { S } from '../../../state.js';
import { el, selectInput } from '../../formControls/index.js';
import { activeParts, activeMotif } from '../../variantQuery.js';
import {
  isGroupNode,
  isAlternativesNode,
  findNodeById,
  siblingIds,
  siblingList,
  nestNode,
  ungroupNode,
  canUngroup,
  moveTargets,
  moveIntoGroup,
  moveIntoOption,
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

/** A labelled group inside the actions block, so the buttons read as a toolbar. */
function actionGroup(title) {
  const g = el('div', 'part-actions-group');
  g.append(el('span', 'part-actions-group-title', title));
  return g;
}

/**
 * The structural actions block: convert to alternatives, nest into a new
 * group, move into/out of an existing group or alternative, ungroup (groups
 * only, when the fold is exact), and copy the transform from a sibling.
 */
export function renderStructureActions(container, entry, ctx) {
  const { node } = entry;

  // Convert selection to alternatives: wrap the node in a choice point with
  // one option holding a copy of it (decorComposition.md §6.2). The node's id
  // becomes the choice point's id (fresh), and the option keeps a renamed copy
  // of the wrapped node so its parts are editable per-config.
  const structure = actionGroup('Restructure');
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
    structure.append(toAltBtn);
  }

  const nestBtn = el('button', null, 'Nest into group');
  nestBtn.type = 'button';
  nestBtn.title = 'Wrap this part in a fresh group — its position is preserved';
  nestBtn.addEventListener('click', () => ctx.mutate(() => {
    const group = nestNode(activeParts(), entry, activeMotif()?.id);
    S.selectedPartId = group.id;
  }));
  structure.append(nestBtn);

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
    structure.append(outBtn);
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
    structure.append(ungroupBtn);
  }

  // Move into an existing group, an alternatives choice point (as a NEW
  // option), or one of its options — position is preserved (frame conversion).
  const targets = moveTargets(activeParts(), entry);
  const moveGroup = actionGroup('Move into…');
  const moveSelect = selectInput(
    [
      { value: '', label: '— choose target…' },
      ...targets.map((t, i) => ({
        value: String(i),
        label: t.kind === 'group'
          ? `${t.id} · group`
          : t.kind === 'choice'
            ? `${t.id} · alternatives (as new option)`
            : `${t.node.id} / ${t.option.id} · option`,
      })),
    ],
    '',
    (v) => {
      if (!v) return;
      const t = targets[Number(v)];
      ctx.mutate(() => {
        if (t.kind === 'group') {
          moveIntoGroup(activeParts(), entry, t.node);
        } else {
          moveIntoOption(activeParts(), entry, t.node, t.kind === 'option' ? t.option : null, activeMotif()?.id);
          // The part now lives only inside one option — force the preview to
          // it so it doesn't vanish from the tile (same rule as rows.js).
          const forced = t.kind === 'option' ? t.option.id : t.node.alternatives[t.node.alternatives.length - 1].id;
          S.previewOptions = new Map(S.previewOptions).set(t.node.id, forced);
        }
        S.selectedPartId = node.id; // the node keeps its id — stay on it
      });
    },
  );
  moveSelect.disabled = targets.length === 0;
  moveSelect.title = 'Move this part into a group, an alternatives choice point (becomes a new option), or one of its options — position is preserved';
  moveGroup.append(moveSelect);
  if (targets.length === 0) {
    moveGroup.append(el('span', 'part-actions-none', 'no eligible targets'));
  }

  // Copy transform: adopt a sibling's transform wholesale. Root-only fields
  // (y / lift / tiltAxis / tilt) don't exist on nested nodes, so a nested
  // source simply lacks them — the copy leaves whatever the target had.
  const ids = siblingIds(activeParts(), entry);
  const copyGroup = actionGroup('Transform');
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
  copyGroup.append(copySelect);

  const actions = el('div', 'part-actions');
  actions.append(structure, moveGroup, copyGroup);
  container.append(actions);
}
