/**
 * motifList.js — The editable motif list of the v6 decor composition panel:
 * one id + base-weight row per motif (duplicate / delete), plus the
 * ＋ Add motif button. The per-biome grid lives in biomeGrid.js.
 */
import { S } from '../../../state.js';
import { el, numberInput } from '../../formControls/index.js';
import { renameMotifId } from '../../renameIds.js';

/** A fresh motif id derived from `base`, unique among `used`. */
export function freshMotifId(used, base = 'motif') {
  const stem = `${base}-${used.length + 1}`;
  if (!used.includes(stem)) return stem;
  let n = 2;
  while (used.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Per-motif size-override chips the user expanded (session state; reset when
 *  another descriptor loads — same pattern as biomeGrid's picker state). */
const expandedSizes = new Set();
let lastListDescriptor = null;

/**
 * The motif rows + add button into `motifSection` (a .inspector-section):
 * per motif an editable id (renames rewrite biomeVariants pins and the
 * motif's part-id prefixes), a base draw weight, an optional per-motif
 * `size` override behind a chip (pattern D — clear deletes the key),
 * duplicate and delete.
 */
export function renderMotifList(motifSection, d, ctx) {
  const motifs = d.motifs;
  if (d !== lastListDescriptor) {
    expandedSizes.clear();
    lastListDescriptor = d;
  }

  // Id + weight inputs with duplicate / delete per motif.
  motifs.forEach((motif, mi) => {
    const mrow = el('div', 'motif-row' + (motif.weight === 0 ? ' weight-zero' : ''));
    const idInput = el('input');
    idInput.type = 'text';
    idInput.className = 'motif-id-input';
    idInput.value = motif.id;
    idInput.title = "Motif id — renames rewrite biomeVariants pins and this motif's part-id prefixes";
    idInput.addEventListener('change', () => {
      const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
      if (!clean || clean === motif.id) { idInput.value = motif.id; return; }
      if (motifs.some((m) => m.id === clean)) {
        window.alert(`Motif id "${clean}" already exists — pick a different name.`);
        idInput.value = motif.id;
        return;
      }
      ctx.mutate(() => {
        renameMotifId(d, motif.id, clean);
        if (S.variantId === motif.id) S.variantId = clean;
      });
    });
    mrow.append(idInput);
    const weight = numberInput(motif.weight, {
      min: 0, step: 0.05,
      onChange: (v) => ctx.mutate(() => { motif.weight = v; }),
    });
    weight.title = 'Base draw weight — 0 excludes the motif everywhere';
    mrow.append(weight);
    // Per-motif size override behind a chip: absent = muted `size +`; present
    // = gold `size n–n` toggling the min/max line; × deletes the key.
    const hasSize = motif.size !== undefined;
    const sizeChip = el('button', 'size-chip' + (hasSize ? ' authored' : ''), hasSize ? `size ${motif.size.min}–${motif.size.max}` : 'size +');
    sizeChip.type = 'button';
    sizeChip.title = hasSize ? 'Per-motif size override — click to collapse, × to clear' : 'Add a per-motif size override (min–max scale multiplier)';
    sizeChip.addEventListener('click', () => {
      if (!hasSize) {
        ctx.mutate(() => { motif.size = { min: 0.9, max: 1.1 }; });
        expandedSizes.add(motif.id);
      } else if (expandedSizes.has(motif.id)) expandedSizes.delete(motif.id);
      else expandedSizes.add(motif.id);
      ctx.renderAll();
    });
    mrow.append(sizeChip);
    if (hasSize && expandedSizes.has(motif.id)) {
      const sizeLine = el('div', 'stretch-inputs');
      sizeLine.append(
        numberInput(motif.size.min, { min: 0.01, step: 0.05, onChange: (v) => ctx.mutate(() => { motif.size.min = v; }) }),
        numberInput(motif.size.max, { min: 0.01, step: 0.05, onChange: (v) => ctx.mutate(() => { motif.size.max = Math.max(v, motif.size.min); }) }),
      );
      const clearSize = el('button', null, '×');
      clearSize.type = 'button';
      clearSize.title = 'Clear the size override';
      clearSize.addEventListener('click', () => ctx.mutate(() => { delete motif.size; }));
      sizeLine.append(clearSize);
      mrow.append(sizeLine);
    }
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
}
