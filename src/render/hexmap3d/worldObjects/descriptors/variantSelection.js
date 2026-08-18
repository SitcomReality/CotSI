/**
 * variantSelection.js — Which variant's parts compose a tile's items (or an
 * entity). Pure — no THREE. See itemSelection in recordBuilder.js.
 */
import { MOUNTAIN_HASH_SEEDS } from '../../../../params/render/geometryParams.js';

/**
 * Which variant's parts compose the items.
 *
 * A decor is the look of ONE terrain (each terrain has its own descriptor —
 * `forest` and `deepWood` are separate objects, never variants of one
 * another), so the only variant dimension on the tile path is the biome:
 *
 *   variants[0]     — the DEFAULT look: every tile renders it unless a pin
 *                     matches (this is why the first variant is the base
 *                     look, and later ones are alternates).
 *   biomeVariants   — { biomeId: variantId } pins an alternate to a biome
 *                     (e.g. the Painforest woods' gnarled variant).
 *   explicitId      — the editor's variant picker forces one variant while
 *                     authoring; a stale id falls through.
 *
 * Precedence (highest first):
 *   1. `explicitId` — the editor forces a variant for preview/editing.
 *   2. `biomeVariants[biomeId]` — a biome pins its look.
 *   3. default — variants[0], unless `variantRule` says otherwise (below).
 *
 * variantRule 'mountain' — legacy mountainMeshes.js roll over the variants
 * list (the mountain descriptor has no biome pins).
 *
 * variantRule 'hash' (default) — roll over the variants list from the tile
 * hash; kept for content that genuinely wants hash-chosen variants (no
 * descriptor uses it today).
 *
 * A rule that names an id the descriptor does not define falls back so a
 * partially-migrated descriptor still renders. The legacy 'cluster' rule
 * (deepWood→tall, else→round) is retired — different terrains are now
 * separate descriptors (normalizeDescriptor migrates old files).
 */

/**
 * @param {string|null} [explicitId] - variant id override (the geometry
 *        editor's variant picker): when the descriptor defines it, that
 *        variant wins over the rule; a stale id falls through to the rule.
 */
export function variantFor(descriptor, tile, tileH, explicitId = null) {
  const variants = descriptor.variants;
  if (!variants || variants.length === 0) return null;
  const byId = (id) => variants.find((v) => v.id === id) ?? null;
  if (explicitId) {
    const forced = byId(explicitId);
    if (forced) return forced;
  }
  // Biome override — a descriptor's per-biome variant wins over the default.
  const biomeVariantId = descriptor.biomeVariants?.[tile.biomeId];
  if (biomeVariantId) {
    const biomeVariant = byId(biomeVariantId);
    if (biomeVariant) return biomeVariant;
  }
  // A biome-pinned descriptor renders its first (default) variant everywhere
  // else — variants are biome alternates, not hash-rolled content.
  if (descriptor.biomeVariants && Object.keys(descriptor.biomeVariants).length > 0) {
    return variants[0];
  }
  const rule = descriptor.variantRule;
  if (rule === 'mountain') {
    // Legacy mountainMeshes.js roll: hash raw (q, r) with MOUNTAIN_HASH_SEEDS
    // so per-tile classic/offpeak assignments match the pre-migration render
    // (a 50/50 mix — only the per-tile assignment order differs from 'hash').
    const hash = ((tile.q * MOUNTAIN_HASH_SEEDS[0] + tile.r * MOUNTAIN_HASH_SEEDS[1]) * MOUNTAIN_HASH_SEEDS[2]) % MOUNTAIN_HASH_SEEDS[3];
    return variants[hash % variants.length];
  }
  const len = variants.length;
  return variants[((tileH % len) + len) % len];
}

/**
 * Which variant's parts compose a single entity (base / champion / mob /
 * trader). Variant ids match the entity attribute that selects them:
 *   variantRule 'faction'    — variant id === entity.faction (e.g. 'CRU')
 *   variantRule 'archetype'  — variant id === entity.archetype (e.g. 'infernalpaca')
 * A missing match (or a rule the entity doesn't satisfy) falls back to the
 * first variant so a partially-migrated descriptor still renders.
 */
export function variantForEntity(descriptor, entity) {
  const variants = descriptor.variants;
  if (!variants || variants.length === 0) return null;
  const rule = descriptor.variantRule;
  if (rule === 'faction' && entity.faction) {
    return variants.find((v) => v.id === entity.faction) ?? variants[0];
  }
  if (rule === 'archetype' && entity.archetype) {
    return variants.find((v) => v.id === entity.archetype) ?? variants[0];
  }
  return variants[0];
}
