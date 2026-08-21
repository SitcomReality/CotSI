/**
 * motifSection/index.js — The v6 decor composition panel
 * (decorComposition.md §6.1) for `kind: 'decor'` descriptors with `motifs` —
 * the replacement for the Variant section.
 *
 * An editable motif list (id, base weight, ＋ Add / duplicate / delete) and a
 * per-biome grid whose cells EDIT the raw `biomeWeight` multiplier (absent ≡
 * 1, 0 ≡ excluded — struck through) while showing each motif's REALIZED share
 * w_i/Σw as a bar. Which motif the parts list edits is the preview-tools
 * Motif select (S.variantId — motif ids only; pin > force > weights). The
 * list and grid live in motifList.js / biomeGrid.js; this barrel composes
 * them.
 */
import { S } from '../../../state.js';
import { el, numberInput } from '../../formControls/index.js';
import { section } from '../sectionShell.js';
import { renderMotifList } from './motifList.js';
import { renderBiomeGrid } from './biomeGrid.js';

/**
 * The motif panel: the repeat-penalty header row, the editable motif list +
 * add button, then the sparse per-biome weight grid with realized-share bars.
 */
export function renderMotifControls(container, ctx) {
  const d = S.descriptor;
  const motifSection = section('motifs', container, () => {
    const ms = d.motifs ?? [];
    if (ms.length === 0) return 'default';
    return `${ms.length} motif${ms.length === 1 ? '' : 's'}`;
  });

  // Repeat penalty — a header-row field of the Motif section, not a section
  // of its own. 1 (= independent draws) is the default and deletes the key.
  const penaltyRow = el('div', 'control-row');
  const penaltyLabel = el('label', null, 'Repeat penalty');
  penaltyLabel.title = 'Without-replacement bias, 0–1 — lower redraws a motif less often; 1 = independent draws';
  penaltyRow.append(penaltyLabel);
  penaltyRow.append(numberInput(d.repeatPenalty ?? 1, { min: 0, max: 1, step: 0.05, onChange: (v) => ctx.mutate(() => {
    if (v >= 1) delete d.repeatPenalty;
    else d.repeatPenalty = v;
  }) }));
  motifSection.append(penaltyRow);

  renderMotifList(motifSection, d, ctx);
  renderBiomeGrid(motifSection, d, ctx);
}
