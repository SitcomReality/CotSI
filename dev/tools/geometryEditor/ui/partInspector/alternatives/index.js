/**
 * alternatives/index.js — Inspector fields for an `alternatives` choice point.
 *
 * The choice point's own fields (decorComposition.md §2.2/§6.2): per-option
 * `weight` (number inputs), the `default` picker (which option Show-all and
 * the preview radio resolve to), a read-only `seed` display (assigned once at
 * node creation, never recomputed), per-option "preview" radios (force that
 * option in the preview — the node-scoped variant picker), add/remove option,
 * and "Add group inside option" (the hinged-elbow pattern: the choice point
 * cannot carry a transform, so hinged configs wrap in a group). The per-option
 * rows live in optionRows.js.
 */
import { S } from '../../../state.js';
import { el, row, selectInput } from '../../formControls/index.js';
import { activeParts, activeMotif } from '../../variantQuery.js';
import { freshId, motifScoped } from '../../partTree/index.js';
import { previewStateFor, setPinnedOption } from '../../previewState.js';
import { renderOptionRows } from './optionRows.js';
import { renderOptionBiomeGrid } from './optionBiomeGrid.js';

/**
 * Render the alternatives node's option table into `container`.
 * @param {object} node - the alternatives choice point
 * @param {object} entry - { node, parent, depth, index, option }
 * @param {object} ctx - the panel mutation context
 */
export function renderAlternativesSection(container, node, entry, ctx) {
  // The active motif scopes new ids under this choice point (decorComposition.md
  // §6.2 — `M/A/localId` for parts inside an option) — null outside motif decors.
  const motifId = activeMotif()?.id;
  container.append(el('div', 'hint', 'A choice point: every item rolls ONE option by weight (seeded per node). The node carries no position — wrap a hinged config in a group inside the option.'));

  // Preview state — every choice point is either natural (a real random roll) or
  // pinned to one option. The Natural radio returns to the random roll; the
  // per-option radios (in optionRows, sharing the same `name`) pin a specific
  // config. Selecting the choice point in the parts tree also returns to natural.
  const state = previewStateFor(S.previewOptions, node.id);
  const natRadio = el('input');
  natRadio.type = 'radio';
  natRadio.name = `preview-${node.id}`;
  natRadio.checked = state.mode === 'natural';
  natRadio.title = 'Show a random config of this choice point (rolling the tile hash) — press re-roll to shuffle it';
  natRadio.addEventListener('change', () => {
    S.previewOptions = setPinnedOption(S.previewOptions, node.id, null);
    ctx.onEdit();
    ctx.renderAll();
  });
  const natLabel = el('span', 'preview-natural-label', 'Natural (random)');
  const natWrap = el('div', 'preview-natural-row');
  natWrap.append(natRadio, natLabel);
  container.append(row('Preview', natWrap));
  const readout = el('div', 'preview-state-readout', state.mode === 'natural'
    ? 'Random config — press re-roll to shuffle'
    : `Pinned to “${state.optionId}” — choose Natural (or select the choice point) to return to random`);
  container.append(readout);

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
  renderOptionRows(container, node, options, motifId, ctx);

  // Per-biome bias grid — which shape variant this choice point favors in
  // each biome (mirror of the decor motif grid, item 2 of
  // sharedMotifLibrary.md).
  renderOptionBiomeGrid(container, node, ctx);

  // Add option.
  const addBtn = el('button', null, '＋ Add alternative');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => ctx.mutate(() => {
    const optId = freshId(activeParts(), motifScoped(`${node.id}-option`, motifId));
    options.push({ id: optId, weight: 1, parts: [] });
  }));
  container.append(addBtn);
}
