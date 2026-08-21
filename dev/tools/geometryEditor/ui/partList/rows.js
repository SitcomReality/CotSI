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
import { openContextMenu } from './contextMenu.js';

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

    // Option rows carry the preview radio — switch which config the preview
    // shows right where you can see it. It shares a name with the inspector's
    // Natural (random) radio, so the whole group is a single choice.
    if (option && node === option) {
      const pradio = el('input');
      pradio.type = 'radio';
      pradio.name = `preview-${choiceId}`;
      const pst = previewStateFor(S.previewOptions, choiceId);
      pradio.checked = pst.mode === 'pinned' && pst.optionId === node.id;
      pradio.title = 'Preview this config';
      pradio.addEventListener('change', () => {
        S.previewOptions = setPinnedOption(S.previewOptions, choiceId, node.id);
        ctx.renderAll();
      });
      r.prepend(pradio);
    }

    // The kind icon tells leaves/groups/options/choice points apart at a
    // glance (Phase 6): shape glyphs for leaves, ▣+count for groups, ⑃ for
    // choice points. Option rows keep their weight text.
    let icon;
    let kind;
    if (alt) {
      icon = '⑃';
      kind = 'alternatives';
    } else if (option && node === option) {
      icon = '⑃';
      kind = `option · w${node.weight ?? 1}`;
    } else if (group) {
      icon = '▣';
      kind = `group · ${node.children.length}`;
    } else {
      icon = { cylinder: '▯', cone: '▲', sphere: '●', box: '■' }[node.shape] ?? '◆';
      kind = node.shape;
    }
    const iconSpan = el('span', 'part-kind-icon', icon);
    iconSpan.title = alt ? 'alternatives choice point' : group ? `group · ${node.children.length} children` : node.shape;
    if (!(option && node === option)) iconSpan.title += ` — ${kind}`;
    const label = el('span', 'part-label', displayLabel(node, { option, choiceId }, motifId));
    label.prepend(iconSpan);
    if (option && node === option) label.append(` · w${node.weight ?? 1}`);
    label.title = `${node.id} · ${kind}`; // full storage id + kind — the display label is just the local name
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

    // Hover-reveal action cluster (Phase 6): verbs fade in on hover/focus/
    // selection so 20 quiet rows don't read as a button wall.
    const rowActions = el('span', 'row-actions');

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
    for (const btn of actions) rowActions.append(btn);

    // Right-click: select the part and open the context menu (same verbs as
    // the hover cluster, plus a jump to the restructure dock).
    r.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      S.selectedPartId = node.id;
      ctx.renderAll();
      openContextMenu(e.clientX, e.clientY, [
        { label: `Duplicate ${displayLabel(node, { option, choiceId }, motifId)}`, act: () => dup.click() },
        { label: 'Move up', act: () => up.click(), disabled: up.disabled },
        { label: 'Move down', act: () => down.click(), disabled: down.disabled },
        { label: 'Delete', act: () => remove.click(), disabled: remove.disabled },
        { label: 'Restructure…', act: () => {
          document.getElementById('part-actions-bar')?.scrollIntoView({ block: 'nearest' });
        } },
      ]);
    });

    r.append(label, rowActions);
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
