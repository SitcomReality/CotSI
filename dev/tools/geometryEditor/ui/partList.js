/**
 * partList.js — Parts list for the geometry editor sidebar.
 *
 * Renders into `#parts-edit` at the top of the inspector column: a
 * "Parts (n)" header with an expand/collapse toggle, an always-visible add
 * row (shape select + "+ Add part" / "+ Group" buttons), and the part rows
 * only while expanded. Parts are a tree now — groups (rendered as
 * `id · group`, collapsible via a ▸/▾ fold button) can hold nested leaves —
 * so the rows render recursively with depth indentation. Each row: label
 * (click to select), ↑/↓ to reorder within its siblings, ✕ to remove the
 * whole subtree. Expanded rows sit in normal flow, pushing the design fields
 * (#inspector-body) down the sidebar.
 */
import { S } from '../state.js';
import { el, selectInput } from './formControls.js';
import { activeParts, activeMotif } from './variantQuery.js';
import { SHAPE_TYPES } from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  isGroupNode,
  isAlternativesNode,
  countNodes,
  findNodeById,
  freshId,
  motifScoped,
  makeGroupNode,
  makeLeafNode,
  makeAlternativesNode,
} from './partTree/index.js';

/** Whether the parts list rows are expanded (collapsed hides just the rows). */
let partsListExpanded = true;

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
function appendRows(listEl, nodes, depth, ctx, option = null, choiceId = null) {
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

    const kind = alt ? 'alternatives' : option ? `option · w${node.weight ?? 1}` : group ? 'group' : node.shape;
    const label = el('span', 'part-label', `${node.id} · ${kind}`);
    label.addEventListener('click', () => {
      S.selectedPartId = node.id;
      // Selecting a part that lives only inside one option auto-switches the
      // preview to that option (a part in a non-previewed option has no gizmo
      // frame — decorComposition.md §6.2).
      if (choiceId && option) {
        S.previewOptions = new Map(S.previewOptions).set(choiceId, option.id);
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

    // Reorder / remove act on the sibling array (the passed `nodes`).
    const up = el('button', null, '↑');
    const down = el('button', null, '↓');
    const remove = el('button', null, '✕');
    up.disabled = index === 0;
    down.disabled = index === nodes.length - 1;
    remove.disabled = nodes.length === 1;
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

    r.append(label, up, down, remove);
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

/**
 * Render the parts list into `container`. `ctx` supplies the panel hooks:
 * `ctx.mutate(fn)` for descriptor changes, `ctx.renderAll()` for pure
 * re-renders (selection clicks, fold/collapse toggles).
 */
export function renderPartsList(container, ctx) {
  container.textContent = '';
  const parts = activeParts();
  // New ids at the root of the edited tree are scoped under the active motif
  // on the v6 decor path (decorComposition.md §6.2) — null outside motif decors.
  const motifId = activeMotif()?.id;

  // Header: "Parts (n)" + the expand/collapse toggle — always visible, so the
  // list can be reopened without hunting for a button further down the panel.
  // The count covers groups and leaves alike.
  const head = el('div', 'parts-head');
  head.append(el('span', 'parts-title', `Parts (${countNodes(parts)})${motifId ? ` · motif ${motifId}` : ''}`));
  const toggle = el('button', 'parts-collapse', partsListExpanded ? '▾' : '▸');
  toggle.type = 'button';
  toggle.title = partsListExpanded ? 'Collapse the parts list' : 'Expand the parts list';
  toggle.setAttribute('aria-label', toggle.title);
  toggle.setAttribute('aria-expanded', String(partsListExpanded));
  toggle.setAttribute('aria-controls', 'parts-list');
  toggle.addEventListener('click', () => {
    partsListExpanded = !partsListExpanded;
    ctx.renderAll();
  });
  head.append(toggle);
  container.append(head);

  // Add row: shape select + buttons stay on one compact line, and remain
  // visible even while the list is collapsed. "+ Add part" appends a root
  // leaf; "+ Group" appends a group already holding one leaf of the chosen
  // shape, so the group renders something the moment it exists.
  const addRow = el('div', 'part-add-row');
  const shapeSelect = selectInput(Object.keys(SHAPE_TYPES), Object.keys(SHAPE_TYPES)[0], () => {});
  const addBtn = el('button', null, '+ Add part');
  addBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    ctx.mutate(() => {
      const id = freshId(parts, motifScoped('part', motifId));
      parts.push(makeLeafNode(shape, id));
      S.selectedPartId = id;
    });
  });
  const addGroupBtn = el('button', null, '+ Group');
  addGroupBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    ctx.mutate(() => {
      const id = freshId(parts, motifScoped('group', motifId));
      const group = makeGroupNode(id);
      group.children.push(makeLeafNode(shape, freshId(parts, motifScoped('part', motifId)), true));
      parts.push(group);
      S.selectedPartId = id;
    });
  });
  addRow.append(shapeSelect, addBtn, addGroupBtn);
  container.append(addRow);

  // Rows only when expanded — they sit in normal flow, pushing the design
  // fields (#inspector-body) down the sidebar.
  const list = el('div', 'parts-list');
  list.id = 'parts-list';
  if (partsListExpanded) appendRows(list, parts, 0, ctx);
  container.append(list);
}
