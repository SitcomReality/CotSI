/**
 * biomeGrid.js — The per-biome weight grid of the v6 decor composition panel:
 * biome rows × motif columns, each cell editing the raw `biomeWeight`
 * multiplier (0 = excluded, struck through; 1 = default, clears the key) with
 * the realized share w_i/Σw drawn as a bar behind it.
 */
import { el, numberInput } from '../../formControls.js';
import { listArchetypes, getArchetype } from '../../../../../../src/game/rules/archetypes.js';
import { effectiveMotifTable } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/motifDraw.js';

/** The realized share of each motif in a biome: w_i / Σw over the effective
 *  (biomeWeight-filtered) table — the readable probability, not the raw
 *  multiplier ("0.7" is unreadable, "42%" is not). */
function motifShares(descriptor, biomeId) {
  const table = effectiveMotifTable(descriptor, biomeId ?? null);
  const total = table.reduce((s, t) => s + t.w, 0);
  if (total <= 0) return new Map();
  return new Map(table.map((t) => [t.entry.id, t.w / total]));
}

/**
 * The per-biome grid into `motifSection`: biome rows × motif columns. Each
 * cell edits the raw biomeWeight multiplier with the realized share drawn as
 * a bar behind it; 1 clears the key (absent ≡ default), 0 strikes the cell
 * through (excluded in this biome).
 */
export function renderBiomeGrid(motifSection, d, ctx) {
  const motifs = d.motifs;
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
      const input = numberInput(raw, { min: 0, step: 0.05, onChange: (v) => ctx.mutate(() => {
        if (v === 1) {
          if (m.biomeWeight) {
            delete m.biomeWeight[biomeId];
            if (Object.keys(m.biomeWeight).length === 0) delete m.biomeWeight;
          }
        } else {
          m.biomeWeight ??= {};
          m.biomeWeight[biomeId] = v;
        }
      }) });
      input.title = 'biomeWeight multiplier — 0 excludes in this biome, 1 = default (clears)';
      td.append(input);
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
