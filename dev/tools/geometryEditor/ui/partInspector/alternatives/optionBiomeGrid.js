/**
 * optionBiomeGrid.js — The per-biome bias grid on an `alternatives` choice
 * point (decorComposition.md §2.2 + item 2 of sharedMotifLibrary.md): biome
 * rows × option columns, each cell editing the raw `biomeWeight` multiplier
 * (0 = excluded in this biome, struck through; 1 = default, clears the key)
 * with the realized share w_i/Σw drawn as a bar behind it. This is the exact
 * mirror of the decor motif grid (objectInspector/motifSection/biomeGrid.js)
 * but for shape-variant options within one parts tree.
 */
import { el, numberInput } from '../../formControls/index.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';

/**
 * The per-biome realized share of each option in a choice point:
 * (weight × biomeWeight[biomeId]) / Σw over the surviving table. Unlike the
 * motif table there is no `biomeWeight` all-excluded fallback to base weight
 * — a choice point with all options excluded in a biome resolves to
 * `default`/first non-empty at draw time (decorComposition.md §2.2). So a
 * biome where every option's effective weight is 0 reports 0% across the
 * board (that's the "excluded everywhere" state, not a divide-by-zero here).
 */
function optionShares(node, biomeId) {
  const opts = node.alternatives;
  const effective = opts
    .map((o) => ({ entry: o, w: (o.weight ?? 1) * (biomeId ? (o.biomeWeight?.[biomeId] ?? 1) : 1) }))
    .filter((t) => t.w > 0);
  const total = effective.reduce((s, t) => s + t.w, 0);
  if (total <= 0) return new Map();
  return new Map(effective.map((t) => [t.entry.id, t.w / total]));
}

/**
 * The per-biome grid for one alternatives choice point into `container`.
 * Cells edit the raw multiplier (0 = excluded, struck through; 1 clears the
 * key), with the realized share as a bar behind the input. Cells are bare
 * number inputs (stepper: false) — the exact share lives in the tooltip.
 * @param {HTMLElement} container - the alternatives panel
 * @param {object} node - the alternatives choice point
 * @param {object} ctx - the panel mutation context (ctx.mutate)
 */
export function renderOptionBiomeGrid(container, node, ctx) {
  const options = node.alternatives ?? [];
  if (options.length === 0) return;
  const biomes = listArchetypes('biome');
  const shareFor = new Map(biomes.map((b) => [b, optionShares(node, b)]));
  const grid = el('div', 'option-biome-grid');
  const head = el('div', 'option-biome-row option-biome-head');
  head.append(el('span', 'biome-cell', 'biome'));
  for (const o of options) {
    const th = el('span', null, o.id);
    th.title = o.id;
    head.append(th);
  }
  grid.append(head);
  for (const biomeId of biomes) {
    const name = getArchetype(biomeId)?.name ?? biomeId;
    const row = el('div', 'option-biome-row');
    const cell = el('span', 'biome-cell', name);
    cell.title = name;
    row.append(cell);
    const shares = shareFor.get(biomeId) ?? new Map();
    for (const o of options) {
      const share = shares.get(o.id) ?? 0;
      const pct = Math.round(share * 100);
      const raw = o.biomeWeight?.[biomeId] ?? 1;
      const input = numberInput(raw, {
        min: 0, step: 0.05, stepper: false,
        onChange: (v) => ctx.mutate(() => {
          if (v === 1) {
            if (o.biomeWeight) {
              delete o.biomeWeight[biomeId];
              if (Object.keys(o.biomeWeight).length === 0) delete o.biomeWeight;
            }
          } else {
            o.biomeWeight ??= {};
            o.biomeWeight[biomeId] = v;
          }
        }),
      });
      input.title = `${pct}% realized share in ${name} — biomeWeight multiplier, 0 excludes here, 1 = default (clears)`;
      const td = el('span', 'option-biome-cell' + (raw === 0 ? ' excluded' : ''));
      td.append(input);
      if (share > 0) {
        const bar = el('div', 'share-bar');
        bar.style.width = `${pct}%`;
        td.append(bar);
      }
      if (raw === 0) td.title = 'excluded in this biome (weight 0)';
      else td.title = `raw multiplier ×${raw} → ${pct}% realized share`;
      row.append(td);
    }
    grid.append(row);
  }
  container.append(grid);
  container.append(el('div', 'hint', 'Per-option biomeWeight biases which shape variant this choice point favors in each biome (absent ≡ 1, struck-through ≡ excluded). Realized share = w·bw / Σw over the surviving options.'));
}