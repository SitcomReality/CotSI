/**
 * alternativesSection.js — Inspector fields for an `alternatives` choice point.
 *
 * The choice point's own fields (decorComposition.md §2.2/§6.2): per-option
 * `weight` (number inputs), the `default` picker (which option Show-all and
 * the preview radio resolve to), a read-only `seed` display (assigned once at
 * node creation, never recomputed), per-option "preview" radios (force that
 * option in the preview — the node-scoped variant picker), add/remove option,
 * and "Add group inside option" (the hinged-elbow pattern: the choice point
 * cannot carry a transform, so hinged configs wrap in a group).
 */
import { S } from '../../state.js';
import { el, row, numberInput, selectInput } from '../formControls.js';
import { activeParts } from '../variantQuery.js';
import { freshId, makeGroupNode, makeLeafNode } from '../partTree/index.js';
import { SHAPE_TYPES } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';

/** Select the first leaf shape from the registry for "add group inside option". */
const firstShape = () => Object.keys(SHAPE_TYPES)[0];

/**
 * Render the alternatives node's option table into `container`.
 * @param {object} node - the alternatives choice point
 * @param {object} entry - { node, parent, depth, index, option }
 * @param {object} ctx - the panel mutation context
 */
export function renderAlternativesSection(container, node, entry, ctx) {
  container.append(el('div', 'hint', 'A choice point: every item rolls ONE option by weight (seeded per node). The node carries no position — wrap a hinged config in a group inside the option.'));

  // Seed — read-only, from the reserved 100–199 lane.
  container.append(row('Seed', el('span', 'readonly-value', String(node.seed ?? '—'))));
  container.append(el('div', 'hint', 'Assigned once at creation — renaming or reordering never reshuffles in-world rolls.'));

  // Default picker.
  const options = node.alternatives ?? [];
  container.append(row('Default', selectInput(
    options.map((o) => ({ value: o.id, label: `${o.id}${o.weight === 0 ? ' (never)' : ''}` })),
    node.default ?? '',
    (v) => ctx.mutate(() => { node.default = v; }),
  )));
  container.append(el('div', 'hint', 'The option "Show all" and the preview radio resolve to — never a "none".'));

  // Per-option rows: weight + preview radio + remove.
  options.forEach((option, oi) => {
    const orow = el('div', 'alternative-row');
    const preview = el('input');
    preview.type = 'radio';
    preview.name = `preview-${node.id}`;
    preview.checked = S.previewOptions.get(node.id) === option.id;
    preview.title = 'Force this option in the preview (node-scoped variant picker)';
    preview.addEventListener('change', () => {
      S.previewOptions = new Map(S.previewOptions).set(node.id, option.id);
      ctx.onEdit();
      ctx.renderAll();
    });
    orow.append(preview);

    const label = el('span', 'part-label', option.id);
    orow.append(label);

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
      const gid = freshId(activeParts(), `${node.id}-hinge`);
      const g = makeGroupNode(gid);
      g.children.push(makeLeafNode(firstShape(), freshId(activeParts(), 'part'), true));
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
      if (S.previewOptions.get(node.id) === option.id) {
        S.previewOptions = new Map(S.previewOptions);
        S.previewOptions.delete(node.id);
      }
    }));
    orow.append(removeOpt);
    container.append(orow);
  });

  // Add option.
  const addBtn = el('button', null, '＋ Add alternative');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => ctx.mutate(() => {
    const optId = freshId(activeParts(), `${node.id}-option`);
    options.push({ id: optId, weight: 1, parts: [] });
  }));
  container.append(addBtn);
}
