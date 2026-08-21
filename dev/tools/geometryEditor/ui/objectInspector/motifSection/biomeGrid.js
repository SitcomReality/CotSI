/**
 * biomeGrid.js — The per-biome weight grid of the v6 decor composition panel:
 * sparse per-biome rows editing the raw `biomeWeight` multiplier (0 =
 * excluded, struck through; 1 = default, clears the key) with the realized
 * share w_i/Σw drawn as a bar behind it. Absent ≡ 1, so only biomes with at
 * least one override (or just added via the `+ biome` picker) get a row —
 * a default decor shows one quiet `Per-biome weights · default` line instead
 * of the full matrix.
 */
import { el, numberInput } from '../../formControls/index.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';
import { effectiveMotifTable } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/motifDraw.js';

/** Biomes revealed via the picker that have no stored keys yet (add mode). */
const extraRows = new Set();
/** Whether the user asked to customize an otherwise-default grid. */
let customized = false;
/** The descriptor the session state belongs to (reset when another loads). */
let lastDescriptor = null;

/** The realized share of each motif in a biome: w_i / Σw over the effective
 *  (biomeWeight-filtered) table — the readable probability, not the raw
 *  multiplier ("0.7" is unreadable, "42%" is not). */
function motifShares(descriptor, biomeId) {
  const table = effectiveMotifTable(descriptor, biomeId ?? null);
  const total = table.reduce((s, t) => s + t.w, 0);
  if (total <= 0) return new Map();
  return new Map(table.map((t) => [t.entry.id, t.w / total]));
}

/** Whether any motif carries a stored key for this biome. */
function hasKey(motifs, biomeId) {
  return motifs.some((m) => m.biomeWeight?.[biomeId] !== undefined);
}

/** Delete the biome's key from every motif. */
function clearBiomeRow(motifs, biomeId) {
  for (const m of motifs) {
    if (!m.biomeWeight) continue;
    delete m.biomeWeight[biomeId];
    if (Object.keys(m.biomeWeight).length === 0) delete m.biomeWeight;
  }
  extraRows.delete(biomeId);
}

/**
 * The per-biome grid into `motifSection`: one row per overridden biome plus
 * a `+ biome` picker. Each cell edits the raw biomeWeight multiplier (0 =
 * excluded, struck through) with the realized share w_i/Σw drawn as a bar
 * behind it; 1 clears the key (absent ≡ default), 0 strikes the cell through.
 * Cells are bare number inputs — the −/+ stepper shell doesn't fit a matrix
 * column, so the grid passes `stepper: false` and the exact realized share
 * lives in the cell tooltip (the bar behind the input is the visual read).
 */
export function renderBiomeGrid(motifSection, d, ctx) {
  const motifs = d.motifs;
  const biomes = listArchetypes('biome');
  if (d !== lastDescriptor) {
    extraRows.clear();
    customized = false;
    lastDescriptor = d;
  }

  // Quiet state: no overrides anywhere and not customizing → one line.
  if (!customized && !biomes.some((b) => hasKey(motifs, b))) {
    const line = el('div', 'grid-quiet-line');
    line.append(el('span', null, 'Per-biome weights · default'));
    const btn = el('button', null, 'Customize by biome');
    btn.type = 'button';
    btn.title = 'Reveal the per-biome weight grid';
    btn.addEventListener('click', () => { customized = true; ctx.renderAll(); });
    line.append(btn);
    motifSection.append(line);
    return;
  }

  const shown = biomes.filter((b) => extraRows.has(b) || hasKey(motifs, b));
  const remaining = biomes.filter((b) => !shown.includes(b));

  const shareFor = new Map(shown.map((b) => [b, motifShares(d, b)]));
  const grid = el('table', 'motif-grid');
  const head = el('tr');
  head.append(el('th', null, 'biome'));
  for (const m of motifs) {
    const th = el('th', null, m.id);
    th.title = m.id; // headers truncate in narrow columns — hover for the full id
    head.append(th);
  }
  head.append(el('th'));
  grid.append(head);
  for (const biomeId of shown) {
    const name = getArchetype(biomeId)?.name ?? biomeId;
    const biomeCell = el('td', 'biome-cell', name);
    biomeCell.title = name; // biome names truncate — hover for the full name
    const tr = el('tr');
    tr.append(biomeCell);
    const shares = shareFor.get(biomeId);
    for (const m of motifs) {
      const share = shares?.get(m.id) ?? 0;
      const pct = Math.round(share * 100);
      const raw = m.biomeWeight?.[biomeId] ?? 1;
      const td = el('td', 'share-cell' + (raw === 0 ? ' excluded' : ''));
      const input = numberInput(raw, {
        min: 0, step: 0.05, stepper: false,
        onChange: (v) => ctx.mutate(() => {
          if (v === 1) {
            if (m.biomeWeight) {
              delete m.biomeWeight[biomeId];
              if (Object.keys(m.biomeWeight).length === 0) delete m.biomeWeight;
            }
          } else {
            m.biomeWeight ??= {};
            m.biomeWeight[biomeId] = v;
          }
        }),
      });
      input.title = `${pct}% realized share in ${name} — biomeWeight multiplier, 0 excludes in this biome, 1 = default (clears)`;
      td.append(input);
      if (share > 0) {
        const bar = el('div', 'share-bar');
        bar.style.width = `${pct}%`;
        td.append(bar);
      }
      if (raw === 0) td.title = 'excluded in this biome (weight 0)';
      else td.title = `raw multiplier ×${raw} → ${pct}% realized share`;
      tr.append(td);
    }
    const clearCell = el('td', 'row-clear-cell');
    const clearBtn = el('button', null, '×');
    clearBtn.type = 'button';
    clearBtn.title = `Clear all ${name} overrides`;
    clearBtn.addEventListener('click', () => ctx.mutate(() => clearBiomeRow(motifs, biomeId)));
    clearCell.append(clearBtn);
    tr.append(clearCell);
    grid.append(tr);
  }
  motifSection.append(grid);

  // Picker: add another biome row (starts in add mode — cells prefilled 1,
  // typing ≠ 1 writes the key).
  if (remaining.length > 0) {
    const addRow = el('div', 'override-add-row');
    addRow.append(el('span', null, '+ biome'));
    addRow.append(selectPicker(remaining, (v) => {
      extraRows.add(v);
      ctx.renderAll();
    }));
    motifSection.append(addRow);
  }
  motifSection.append(el('div', 'hint', 'Realized share = w_i / Σw over the filtered table — the actual probability, not the raw multiplier (bar width). Struck-through = excluded.'));
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
