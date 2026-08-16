/**
 * variantSection.js — The Variant section for tile-driven objects without
 * motifs (the v6 motif panel replaces it for decor descriptors with `motifs`).
 *
 * Descriptors with variants get the variant picker (drives S.variantId) plus
 * the per-biome pin list; single-look objects get a "Duplicate variant"
 * button that converts the fallback look into variants[0] and copies it — the
 * per-biome decor workflow: reshape the copy for a biome, then pin it.
 */
import { el, row, selectInput } from '../formControls/index.js';
import { S } from '../../state.js';
import { section } from './sectionShell.js';
import { renderBiomeVariantPins } from './biomePins.js';
import { duplicateVariant } from './variantDuplicate.js';
import { renameVariantId } from '../renameIds.js';

/**
 * Render the Variant section — picker + duplicate button when variants exist,
 * the "one look" duplicate button when not. `d` is the descriptor.
 */
export function renderVariantSection(container, d, ctx) {
  const variantSection = section('variant', container);
  const hasVariants = (d.variants ?? []).length > 0;
  if (hasVariants) {
    const ids = d.variants.map((v) => v.id);
    const current = ids.includes(S.variantId) ? S.variantId : ids[0];
    const active = d.variants.find((v) => v.id === current);
    const picker = el('div', 'variant-picker');
    picker.append(selectInput(ids, current, (v) => ctx.mutate(() => { S.variantId = v; })));
    const dupBtn = el('button', 'create-btn', '＋ Duplicate');
    dupBtn.type = 'button';
    dupBtn.title = 'Create a new variant from a copy of the current look — then pin it to biomes below';
    dupBtn.addEventListener('click', () => duplicateVariant(d, ctx));
    picker.append(dupBtn);
    variantSection.append(row('Variant', picker));

    // The active variant's id is editable — renames rewrite biomeVariants
    // pins that named it and follow the picker selection.
    const idInput = el('input');
    idInput.type = 'text';
    idInput.value = active.id;
    idInput.title = 'Variant id — renames rewrite biomeVariants pins and the picker';
    idInput.addEventListener('change', () => {
      const clean = idInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
      if (!clean || clean === active.id) { idInput.value = active.id; return; }
      if (d.variants.some((v) => v.id === clean)) {
        window.alert(`Variant id "${clean}" already exists — pick a different name.`);
        idInput.value = active.id;
        return;
      }
      ctx.mutate(() => {
        renameVariantId(d, active.id, clean);
        if (S.variantId === active.id) S.variantId = clean;
      });
    });
    variantSection.append(row('Variant id', idInput));
    variantSection.append(el('div', 'hint', 'The parts list and preview edit this variant. In-game the first variant is the default look; per-biome pins swap in alternates.'));
    renderBiomeVariantPins(section('biomePins', container), ctx);
  } else {
    const dupBtn = el('button', 'create-btn', '＋ Duplicate variant');
    dupBtn.type = 'button';
    dupBtn.title = 'Create a new variant from a copy of the current look — then pin it to biomes below';
    dupBtn.addEventListener('click', () => duplicateVariant(d, ctx));
    variantSection.append(row('Variants', dupBtn));
    variantSection.append(el('div', 'hint', 'This object has one look. Duplicate it to give different biomes different geometry (e.g. a dead-tree forest for Sere Wastes) — the copy becomes a variant you can pin to biomes.'));
  }
}
