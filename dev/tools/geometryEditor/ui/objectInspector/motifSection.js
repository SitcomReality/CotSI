/**
 * motifSection.js — The v6 decor composition panel (decorComposition.md §6.1)
 * for `kind: 'decor'` descriptors with `motifs` — the replacement for the
 * Variant section.
 *
 * A motif list with weight inputs (＋ Add / duplicate / delete), a per-biome
 * grid showing each motif's REALIZED share w_i/Σw (with a bar; excluded cells
 * struck through), and a "Force motif" picker that drives S.variantId (motif
 * ids only — the record path treats the explicit id as a forced motif,
 * pin > force > weights).
 */
import { S } from '../../state.js';
import { el, row, selectInput, numberInput } from '../formControls.js';
import { listArchetypes, getArchetype } from '../../../../../src/game/rules/archetypes.js';
import { effectiveMotifTable } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/motifDraw.js';
import { section } from './sectionShell.js';

/** The realized share of each motif in a biome: w_i / Σw over the effective
 *  (biomeWeight-filtered) table — the readable probability, not the raw
 *  multiplier ("0.7" is unreadable, "42%" is not). */
function motifShares(descriptor, biomeId) {
  const table = effectiveMotifTable(descriptor, biomeId ?? null);
  const total = table.reduce((s, t) => s + t.w, 0);
  if (total <= 0) return new Map();
  return new Map(table.map((t) => [t.entry.id, t.w / total]));
}

/** A fresh motif id derived from `base`, unique among `used`. */
function freshMotifId(used, base = 'motif') {
  const stem = `${base}-${used.length + 1}`;
  if (!used.includes(stem)) return stem;
  let n = 2;
  while (used.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * The motif panel: weight inputs + duplicate / delete per motif, the Force
 * motif picker, and the per-biome realized-share grid — biome rows × motif
 * columns.
 */
export function renderMotifControls(container, ctx) {
  const d = S.descriptor;
  const motifs = d.motifs;

  const motifSection = section('motifs', container);
  const ids = motifs.map((m) => m.id);

  // Weight inputs + duplicate / delete per motif.
  motifs.forEach((motif, mi) => {
    const mrow = el('div', 'motif-row');
    const label = el('span', 'part-label', motif.id);
    mrow.append(label);
    const weight = numberInput(motif.weight, {
      min: 0, step: 0.05,
      onChange: (v) => ctx.mutate(() => { motif.weight = v; }),
    });
    weight.title = 'Base draw weight — 0 excludes the motif everywhere';
    mrow.append(weight);
    const dup = el('button', null, '⧉');
    dup.type = 'button';
    dup.title = 'Duplicate this motif';
    dup.addEventListener('click', () => ctx.mutate(() => {
      const copy = JSON.parse(JSON.stringify(motif));
      copy.id = freshMotifId(d.motifs.map((m) => m.id), motif.id);
      d.motifs.splice(mi + 1, 0, copy);
    }));
    mrow.append(dup);
    const del = el('button', null, '✕');
    del.type = 'button';
    del.disabled = motifs.length === 1;
    del.title = 'Delete this motif';
    del.addEventListener('click', () => ctx.mutate(() => {
      d.motifs.splice(mi, 1);
      if (S.variantId === motif.id) S.variantId = null;
    }));
    mrow.append(del);
    motifSection.append(mrow);
  });

  const addBtn = el('button', 'create-btn', '＋ Add motif');
  addBtn.type = 'button';
  addBtn.addEventListener('click', () => ctx.mutate(() => {
    const id = freshMotifId(d.motifs.map((m) => m.id));
    d.motifs.push({ id, weight: 1, biomeWeight: {}, parts: [] });
  }));
  motifSection.append(addBtn);

  // Force motif picker — the variant picker's role, motif ids only.
  const force = el('div', 'variant-picker');
  const picker = selectInput(
    [{ value: '', label: '— real rolls (weights)' }, ...ids.map((id) => ({ value: id, label: id }))],
    S.variantId ?? '',
    (v) => ctx.mutate(() => { S.variantId = v || null; }),
  );
  force.append(picker);
  motifSection.append(row('Force motif', force));
  motifSection.append(el('div', 'hint', 'When forced, every slot draws that motif (catalog mode) — the strip switches to it. In-game: pins > force > weights.'));

  // Per-biome realized-share grid — biome rows × motif columns.
  const biomes = listArchetypes('biome');
  const shareFor = new Map(biomes.map((b) => [b, motifShares(d, b)]));
  const grid = el('table', 'motif-grid');
  const head = el('tr');
  head.append(el('th', null, 'biome'));
  for (const m of motifs) head.append(el('th', null, m.id));
  grid.append(head);
  for (const biomeId of biomes) {
    const tr = el('tr');
    tr.append(el('td', 'biome-cell', getArchetype(biomeId)?.name ?? biomeId));
    const shares = shareFor.get(biomeId);
    for (const m of motifs) {
      const share = shares?.get(m.id) ?? 0;
      const raw = m.biomeWeight?.[biomeId] ?? 1;
      const td = el('td', 'share-cell' + (raw === 0 ? ' excluded' : ''));
      if (share > 0) {
        const bar = el('div', 'share-bar');
        bar.style.width = `${Math.round(share * 100)}%`;
        td.append(bar);
        td.append(el('span', 'share-label', `${Math.round(share * 100)}%`));
      } else {
        td.append(el('span', 'share-label', '—'));
      }
      if (raw === 0) td.title = 'excluded in this biome (weight 0)';
      else td.title = `raw multiplier ×${raw} → realized share`;
      tr.append(td);
    }
    grid.append(tr);
  }
  motifSection.append(grid);
  motifSection.append(el('div', 'hint', 'Realized share = w_i / Σw over the filtered table — the actual probability, not the raw multiplier. Struck-through = excluded.'));
}
