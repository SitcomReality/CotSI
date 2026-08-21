/**
 * optionBiomeGrid.js — The sparse per-biome bias rows on an `alternatives`
 * choice point (decorComposition.md §2.2 + item 2 of sharedMotifLibrary.md):
 * one row per biome with at least one override (or just added via the
 * `+ biome` picker), each cell editing the raw `biomeWeight` multiplier
 * (0 = excluded in this biome, struck through; 1 = default, clears the key)
 * with the realized share w_i/Σw drawn as a bar behind it. Absent ≡ 1, so a
 * choice point without overrides shows one quiet
 * `Per-biome weights · default` line + a Customize button instead of the
 * full biome × option matrix. This is the exact mirror of the decor motif
 * grid (objectInspector/motifSection/biomeGrid.js) but for shape-variant
 * options within one parts tree.
 */
import { el, numberInput } from '../../formControls/index.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';

/** Per-choice-point UI session state (picker-added rows, customize flag),
 *  keyed by the node object — multiple choice points can be on screen. */
const session = new Map();

/** The per-biome realized share of each option in a choice point:
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

/** Whether any option carries a stored key for this biome. */
function hasKey(options, biomeId) {
  return options.some((o) => o.biomeWeight?.[biomeId] !== undefined);
}

/** Delete the biome's key from every option. */
function clearBiomeRow(options, biomeId) {
  for (const o of options) {
    if (!o.biomeWeight) continue;
    delete o.biomeWeight[biomeId];
    if (Object.keys(o.biomeWeight).length === 0) delete o.biomeWeight;
  }
}

/** A bare `<select>` whose first option is a disabled placeholder. */
function selectPicker(options, onPick) {
  const select = el('select');
  const placeholder = el('option', null, 'pick a biome');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.append(placeholder);
  for (const id of options) {
    const o = el('option', null, getArchetype(id)?.name ?? id);
    o.value = id;
    o.title = id;
    select.append(o);
  }
  select.addEventListener('change', () => {
    if (!select.value) return;
    onPick(select.value);
  });
  return select;
}

/**
 * The sparse per-biome grid for one alternatives choice point into
 * `container`. Cells edit the raw multiplier (0 = excluded, struck through;
 * 1 clears the key), with the realized share as a bar behind the input.
 * Cells are bare number inputs (stepper: false) — the exact share lives in
 * the tooltip.
 * @param {HTMLElement} container - the alternatives panel
 * @param {object} node - the alternatives choice point
 * @param {object} ctx - the panel mutation context (ctx.mutate)
 */
export function renderOptionBiomeGrid(container, node, ctx) {
  const options = node.alternatives ?? [];
  if (options.length === 0) return;

  let state = session.get(node);
  if (!state) {
    state = { extraRows: new Set(), customized: false };
    session.set(node, state);
  }

  const biomes = listArchetypes('biome');

  // Quiet state: no overrides anywhere and not customizing → one line.
  if (!state.customized && !biomes.some((b) => hasKey(options, b))) {
    const line = el('div', 'grid-quiet-line');
    line.append(el('span', null, 'Per-biome weights · default'));
    const btn = el('button', null, 'Customize by biome');
    btn.type = 'button';
    btn.title = 'Reveal the per-biome weight grid';
    btn.addEventListener('click', () => { state.customized = true; ctx.renderAll(); });
    line.append(btn);
    container.append(line);
    return;
  }

  const shown = biomes.filter((b) => state.extraRows.has(b) || hasKey(options, b));
  const remaining = biomes.filter((b) => !shown.includes(b));

  const shareFor = new Map(shown.map((b) => [b, optionShares(node, b)]));
  const grid = el('div', 'option-biome-grid');
  const head = el('div', 'option-biome-row option-biome-head');
  head.append(el('span', 'biome-cell', 'biome'));
  for (const o of options) {
    const th = el('span', null, o.id);
    th.title = o.id;
    head.append(th);
  }
  head.append(el('span', 'row-clear-cell'));
  grid.append(head);
  for (const biomeId of shown) {
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
    const clearCell = el('span', 'row-clear-cell');
    const clearBtn = el('button', null, '×');
    clearBtn.type = 'button';
    clearBtn.title = `Clear all ${name} overrides`;
    clearBtn.addEventListener('click', () => {
      ctx.mutate(() => clearBiomeRow(options, biomeId));
      state.extraRows.delete(biomeId);
    });
    clearCell.append(clearBtn);
    row.append(clearCell);
    grid.append(row);
  }
  container.append(grid);

  // Picker: add another biome row (starts in add mode — cells prefilled 1,
  // typing ≠ 1 writes the key).
  if (remaining.length > 0) {
    const addRow = el('div', 'override-add-row');
    addRow.append(el('span', null, '+ biome'));
    addRow.append(selectPicker(remaining, (v) => {
      state.extraRows.add(v);
      ctx.renderAll();
    }));
    container.append(addRow);
  }
  container.append(el('div', 'hint', 'Per-option biomeWeight biases which shape variant this choice point favors in each biome (absent ≡ 1, struck-through ≡ excluded). Realized share = w·bw / Σw over the surviving options.'));
}
