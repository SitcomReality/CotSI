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
import { section } from '../sectionShell.js';
import { renderMotifList } from './motifList.js';
import { renderBiomeGrid } from './biomeGrid.js';

/**
 * The motif panel: the editable motif list + add button, then the per-biome
 * weight grid with realized-share bars.
 */
export function renderMotifControls(container, ctx) {
  const d = S.descriptor;
  const motifSection = section('motifs', container);
  renderMotifList(motifSection, d, ctx);
  renderBiomeGrid(motifSection, d, ctx);
}
