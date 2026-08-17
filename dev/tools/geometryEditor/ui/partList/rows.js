/**
 * rows.js — Recursive part-row rendering for the parts list: one row per node
 * in the active parts tree — fold buttons for groups/alternatives, the label
 * (click to select), growth-state keyframe badges, and the ↑/↓/✕ sibling
 * actions. Alternatives nodes render their option rows beneath them, plus a
 * preview-state badge and a cycle-configs button.
 */
import { S } from '../../state.js';
import { el } from '../formControls/index.js';
import { activeParts, activeMotif } from '../variantQuery.js';
import {
  isGroupNode,
  isAlternativesNode,
  findNodeById,
  freshId,
  motifScoped,
  duplicateInList,
} from '../partTree/index.js';
import { previewStateFor, setPinnedOption } from '../previewState.js';
import { displayLabel } from '../partTree/labels.js';

/** Group ids whose children are hidden in the list (session state). */
const collapsedGroups = new Set();

/** Seeds already taken by alternatives nodes in the tree (for fresh nodes). */
function takenSeeds(parts) {
  const seeds = new Set();
  for (const e of listNodesOf(parts)) {
    if (e.node.seed !== undefined) seeds.add(e.node.seed);
  }
  return seeds;
}

// listNodes isn't re-exported; walk once here for seed scanning.
function listNodesOf(parts) {
  const out = [];
  const walk = (list) => {
    for (const node of list) {
      out.push(node);
      if (Array.isArray(node.alternatives)) {
        for (const opt of node.alternatives) walk(opt.parts ?? []);
      } else if (Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(parts);
  return out;
}

/**
 * Append one row per node in `nodes` (the parts array, a group's children, or
 * an option's parts). Alternatives nodes render their option rows beneath
 * them; each option's parts recurse with the option's id as the parent slot.
 * `choiceId` names the alternatives node an option subtree belongs to (for the
 * preview auto-switch when selecting a part inside an option).
 */
export function appendRows(listEl, nodes, depth, ctx, option = null, choiceId = null) {
  // The active motif scopes new ids added under it (decorComposition.md §6.2
  // — storage ids carry the motif context so authors never hand-maintain the
  // global part-id namespace). null outside motif decors.
  const motifId = activeMotif()?.id;
  nodes.forEach((node, index) => {
    const group = isGroupNode(node);
    const alt = isAlternativesNode(node);
    const r = el(
      'div',
      'part-row' +
        (group ? ' group' : '') +
        (alt ? ' alternatives' : '') +
        (option ? ' option-row' : '') +
        (node.id === S.selectedPartId ? ' selected' : ''),
    );
    r.style.marginLeft = `${depth * 14}px`;

    // Groups and alternatives nodes get a fold button for their subtree rows.
    if (group || alt) {
      const collapsed = collapsedGroups.has(node.id);
      const fold = el('button', 'part-fold', collapsed ? '▸' : '▾');
      fold.type = 'button';
      fold.title = collapsed ? 'Expand' : 'Collapse';
      fold.addEventListener('click', () => {
        if (collapsed) collapsedGroups.delete(node.id);
        else collapsedGroups.add(node.id);
        ctx.renderAll();
      });
      r.append(fold);
    }

    // A live preview-state badge on choice points: natural (random) by default,
    // or which config is currently pinned — so a forced option is never silent.
    if (alt) {
      const state = previewStateFor(S.previewOptions, node.id);
      const pinned = state.mode === 'pinned';
      const badge = el('span', 'preview-badge' + (pinned ? ' pinned' : ''),
        pinned ? `→ ${state.optionId}` : '↻ natural');
      badge.title = pinned
        ? `Previewing: pinned to “${state.optionId}” — select this choice point (or choose Natural) to return to random`
        : 'Previewing a random config — press re-roll to shuffle';
      r.append(badge);
    }

    // The kind tag tells leaves/groups/options/choice points apart. Only an
    // option ROW carries a weight — a leaf or group nested inside an option is
    // not an option and must not inherit a bogus `w1`.
    let kind;
    if (alt) kind = 'alternatives';
    else if (option && node === option) kind = `option · w${node.weight ?? 1}`;
    else kind = group ? 'group' : node.shape;
    const label = el('span', 'part-label', `${displayLabel(node, { option, choiceId }, motifId)} · ${kind}`);
    label.title = node.id; // full storage id — the display label is just the local name
    label.addEventListener('click', () => {
      S.selectedPartId = node.id;
      if (alt) {
        // Selecting the choice point itself returns the preview to its natural
        // (random) state — the "show me this object without a config forced"
        // gesture. A pin is now visible (badge) and reversible.
        S.previewOptions = setPinnedOption(S.previewOptions, node.id, null);
      } else if (choiceId && option) {
        // Selecting a part that lives only inside one option auto-switches the
        // preview to that option (a part in a non-previewed option has no gizmo
        // frame — decorComposition.md §6.2).
        S.previewOptions = setPinnedOption(S.previewOptions, choiceId, option.id);
      }
      ctx.renderAll();
      ctx.onEdit();
    });

    // Growth-state keyframe badge — this part changes between empty (growth 0)
    // and full (growth 1) as its feature regrows.
    if (!group && !alt && node.states?.empty) {
      const badge = el('span', 'part-state-badge', '◐');
      badge.title = 'Has a growth-state keyframe (empty → full)';
      r.append(badge);
    }

    // Reorder / remove act on the sibling array (the passed `nodes`);
    // duplicate copies the node (subtree + fresh ids) right after it, in the
    // same list slot, so the copy keeps the original's place in the hierarchy.
    const dup = el('button', null, '⧉');
    const up = el('button', null, '↑');
    const down = el('button', null, '↓');
    const remove = el('button', null, '✕');
    up.disabled = index === 0;
    down.disabled = index === nodes.length - 1;
    remove.disabled = nodes.length === 1;
    dup.title = 'Duplicate — copies this part (and its subtree) with fresh ids, inserted right after';
    dup.addEventListener('click', () => ctx.mutate(() => {
      const copy = duplicateInList(activeParts(), nodes, index, motifId);
      S.selectedPartId = copy.id;
      // Inside an option, keep the preview pinned to the option the copy lives
      // in (same auto-switch rule as the label click).
      if (choiceId && option) {
        S.previewOptions = setPinnedOption(S.previewOptions, choiceId, option.id);
      }
    }));
    up.addEventListener('click', () => ctx.mutate(() => {
      [nodes[index - 1], nodes[index]] = [nodes[index], nodes[index - 1]];
    }));
    down.addEventListener('click', () => ctx.mutate(() => {
      [nodes[index + 1], nodes[index]] = [nodes[index], nodes[index + 1]];
    }));
    remove.addEventListener('click', () => ctx.mutate(() => {
      nodes.splice(index, 1);
      // The removed subtree may have held the selection — drop it then.
      if (findNodeById(activeParts(), S.selectedPartId) === null) {
        S.selectedPartId = null;
      }
    }));

    // Cycle-configs button on choice points: step the pinned option through
    // Natural → each config → back to Natural, so every config can be eyed up
    // without hunting the radio group (previewState.js).
    const actions = [dup, up, down, remove];
    if (alt) {
      const cycle = el('button', null, '⟳');
      cycle.title = 'Cycle the preview through each config (Natural → each option → back)';
      cycle.addEventListener('click', () => {
        const seq = [null, ...(node.alternatives ?? []).map((o) => o.id)];
        const state = previewStateFor(S.previewOptions, node.id);
        let i = seq.indexOf(state.mode === 'pinned' ? state.optionId : null);
        if (i === -1) i = 0;
        S.previewOptions = setPinnedOption(S.previewOptions, node.id, seq[(i + 1) % seq.length]);
        ctx.renderAll();
      });
      actions.unshift(cycle);
    }

    r.append(label, ...actions);
    listEl.append(r);

    if (alt && !collapsedGroups.has(node.id)) {
      // Option rows (with a "+" to add another option) sit directly under the
      // choice point; each option's parts recurse beneath it.
      node.alternatives.forEach((opt) => {
        appendRows(listEl, opt.parts ?? [], depth + 1, ctx, opt, node.id);
      });
      const addOption = el('div', 'part-add-row');
      addOption.style.marginLeft = `${(depth + 1) * 14}px`;
      const addOptBtn = el('button', null, '+ Add alternative');
      addOptBtn.type = 'button';
      addOptBtn.title = 'Add another option to this choice point';
      addOptBtn.addEventListener('click', () => ctx.mutate(() => {
        const optId = freshId(activeParts(), motifScoped(`${node.id}-option`, motifId));
        node.alternatives.push({ id: optId, weight: 1, parts: [] });
      }));
      addOption.append(addOptBtn);
      listEl.append(addOption);
    } else if (group && !collapsedGroups.has(node.id)) {
      appendRows(listEl, node.children, depth + 1, ctx);
    }
  });
}
