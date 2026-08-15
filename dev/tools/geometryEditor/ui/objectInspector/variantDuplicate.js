/**
 * variantDuplicate.js — The "duplicate the current look into a NEW variant"
 * workflow.
 *
 * The source is the active variant when the descriptor has variants; a
 * descriptor with only a fallback `parts` list gets its look converted into
 * the default variant first (same geometry — variants[0] is the default look
 * convention), then the copy lands after it.
 *
 * This is the per-biome decor workflow: duplicate the default look (e.g. the
 * lush `round` forest), reshape the copy into a biome-appropriate tree (bare
 * dead branches for Sere Wastes), then pin the new variant to that biome in
 * the Per-biome variants section. Entity kinds never reach this — their
 * variants are selected by faction/archetype, not the picker.
 */
import { S } from '../../state.js';
import { activeVariant } from '../variantQuery.js';

/** A fresh variant id derived from `base` (`<base>-copy`, then numbered),
 *  unique among `used`. */
function freshVariantId(used, base) {
  const stem = `${base}-copy`;
  if (!used.includes(stem)) return stem;
  let n = 2;
  while (used.includes(`${stem}-${n}`)) n++;
  return `${stem}-${n}`;
}

/**
 * Prompt for a new variant id and duplicate the current look into it,
 * selected for editing right away. Cancelled prompts are a no-op; duplicate
 * ids are rejected. `ctx` supplies `mutate()`.
 */
export function duplicateVariant(d, ctx) {
  const hasVariants = Array.isArray(d.variants) && d.variants.length > 0;
  const source = activeVariant();
  const sourceParts = source?.parts ?? d.parts;
  const used = (d.variants ?? []).map((v) => v.id);
  const suggested = freshVariantId(used, source?.id ?? 'default');
  const raw = window.prompt('New variant id — a copy of the current look:', suggested);
  if (raw === null) return; // cancelled
  const clean = raw.trim().replace(/[^A-Za-z0-9_-]/g, '_');
  if (!clean) return;
  if (used.includes(clean)) {
    window.alert(`Variant id "${clean}" already exists — pick a different name.`);
    return;
  }
  ctx.mutate(() => {
    if (!hasVariants) {
      // Convert the fallback look into variants[0] — the default look.
      d.variants = [{
        id: freshVariantId([clean], 'default'),
        parts: JSON.parse(JSON.stringify(d.parts)),
      }];
    }
    d.variants.push({ id: clean, parts: JSON.parse(JSON.stringify(sourceParts)) });
    S.variantId = clean;
  });
}
