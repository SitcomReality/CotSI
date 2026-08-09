/**
 * partList.js — Parts list for the geometry editor sidebar.
 *
 * Renders into `#parts-edit` at the top of the inspector column: a
 * "Parts (n)" header with an expand/collapse toggle, an always-visible add
 * row (shape select + button), and the part rows (select / reorder / remove)
 * only while expanded. Expanded rows sit in normal flow, pushing the design
 * fields (#inspector-body) down the sidebar.
 */
import { S } from '../state.js';
import { el, selectInput } from './formControls.js';
import { activeParts } from './variantQuery.js';
import {
  SHAPE_TYPES,
  PART_TRANSFORM_DEFAULTS,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';

/** Whether the parts list rows are expanded (collapsed hides just the rows). */
let partsListExpanded = true;

/** Session counter for parts added through the "+ Add part" row. */
let partCounter = 1;

/**
 * Render the parts list into `container`. `ctx` supplies the panel hooks:
 * `ctx.mutate(fn)` for descriptor changes, `ctx.renderAll()` for pure
 * re-renders (selection clicks, the collapse toggle).
 */
export function renderPartsList(container, ctx) {
  container.textContent = '';
  const parts = activeParts();

  // Header: "Parts (n)" + the expand/collapse toggle — always visible, so the
  // list can be reopened without hunting for a button further down the panel.
  const head = el('div', 'parts-head');
  head.append(el('span', 'parts-title', `Parts (${parts.length})`));
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

  // Add part: shape select + button stay on one compact line, and remain
  // visible even while the list is collapsed.
  const addRow = el('div', 'part-add-row');
  const shapeSelect = selectInput(Object.keys(SHAPE_TYPES), Object.keys(SHAPE_TYPES)[0], () => {});
  const addBtn = el('button', null, '+ Add part');
  addBtn.addEventListener('click', () => {
    const shape = shapeSelect.value;
    ctx.mutate(() => {
      // Must carry a full transform — recordForPart reads part.transform and
      // normalizePart (schema.js) is what guarantees it for loaded JSON.
      parts.push({
        id: `part-${partCounter++}`,
        shape,
        params: { ...SHAPE_TYPES[shape].defaults },
        transform: { ...PART_TRANSFORM_DEFAULTS },
      });
    });
  });
  addRow.append(shapeSelect, addBtn);
  container.append(addRow);

  // Rows only when expanded — they sit in normal flow, pushing the design
  // fields (#inspector-body) down the sidebar.
  const list = el('div', 'parts-list');
  list.id = 'parts-list';
  if (partsListExpanded) {
    parts.forEach((part, i) => {
      const r = el('div', 'part-row' + (part.id === S.selectedPartId ? ' selected' : ''));
      const label = el('span', 'part-label', `${part.id} · ${part.shape}`);
      label.addEventListener('click', () => {
        S.selectedPartId = part.id;
        ctx.renderAll();
      });

      const up = el('button', null, '↑');
      const down = el('button', null, '↓');
      const remove = el('button', null, '✕');
      up.disabled = i === 0;
      down.disabled = i === parts.length - 1;
      remove.disabled = parts.length === 1;
      up.addEventListener('click', () => ctx.mutate(() => {
        [parts[i - 1], parts[i]] = [parts[i], parts[i - 1]];
      }));
      down.addEventListener('click', () => ctx.mutate(() => {
        [parts[i + 1], parts[i]] = [parts[i], parts[i + 1]];
      }));
      remove.addEventListener('click', () => ctx.mutate(() => {
        parts.splice(i, 1);
        if (S.selectedPartId === part.id) S.selectedPartId = null;
      }));

      r.append(label, up, down, remove);
      list.append(r);
    });
  }
  container.append(list);
}
