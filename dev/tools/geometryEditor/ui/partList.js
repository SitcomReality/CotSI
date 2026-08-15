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
import { activeParts } from './variantQuery.js';
import { SHAPE_TYPES } from '../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  isGroupNode,
  countNodes,
  findNodeById,
  freshId,
  makeGroupNode,
  makeLeafNode,
} from './partTree/index.js';

/** Whether the parts list rows are expanded (collapsed hides just the rows). */
let partsListExpanded = true;

/** Group ids whose children are hidden in the list (session state). */
const collapsedGroups = new Set();

/** Append one row per node in `nodes` (the parts array or a group's children). */
function appendRows(listEl, nodes, depth, ctx) {
  nodes.forEach((node, index) => {
    const group = isGroupNode(node);
    const r = el(
      'div',
      'part-row' +
        (group ? ' group' : '') +
        (node.id === S.selectedPartId ? ' selected' : ''),
    );
    r.style.marginLeft = `${depth * 14}px`;

    // Groups get a fold button that hides/shows their subtree rows.
    if (group) {
      const collapsed = collapsedGroups.has(node.id);
      const fold = el('button', 'part-fold', collapsed ? '▸' : '▾');
      fold.type = 'button';
      fold.title = collapsed ? 'Expand group' : 'Collapse group';
      fold.addEventListener('click', () => {
        if (collapsed) collapsedGroups.delete(node.id);
        else collapsedGroups.add(node.id);
        ctx.renderAll();
      });
      r.append(fold);
    }

    const label = el(
      'span',
      'part-label',
      group ? `${node.id} · group` : `${node.id} · ${node.shape}`,
    );
    label.addEventListener('click', () => {
      S.selectedPartId = node.id;
      ctx.renderAll();
    });

    // Growth-state keyframe badge — this part changes between empty (growth 0)
    // and full (growth 1) as its feature regrows.
    if (!group && node.states?.empty) {
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

    if (group && !collapsedGroups.has(node.id)) {
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

  // Header: "Parts (n)" + the expand/collapse toggle — always visible, so the
  // list can be reopened without hunting for a button further down the panel.
  // The count covers groups and leaves alike.
  const head = el('div', 'parts-head');
  head.append(el('span', 'parts-title', `Parts (${countNodes(parts)})`));
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
      const id = freshId(parts, 'part');
      parts.push(makeLeafNode(shape, id));
      S.selectedPartId = id;
    });
  });
  const addGroupBtn = el('button', null, '+ Group');
  addGroupBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    ctx.mutate(() => {
      const id = freshId(parts, 'group');
      const group = makeGroupNode(id);
      group.children.push(makeLeafNode(shape, freshId(parts, 'part'), true));
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
