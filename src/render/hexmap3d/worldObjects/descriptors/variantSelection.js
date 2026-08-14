/**
 * variantSelection.js — Which variant's parts compose a tile's items (or an
 * entity). Pure — no THREE. See itemSelection in recordBuilder.js.
 */
import { MOUNTAIN_HASH_SEEDS } from '../../../../params/render/geometryParams.js';

/**
 * Which variant's parts compose the items.
 *
 * variantRule 'hash' (default) — roll over the variants list from the tile
 * hash; the generic rule for any content with hash-chosen variants (mountains).
 *
 * variantRule 'cluster' — replicate clusterVariant(): denseForest groves are
 * conical (tall) pines, everything else round.
 *
 * A descriptor's `biomeVariants` (biomeId → variant id) takes precedence over
 * the variantRule, so a biome overrides its decor's look (e.g. the Painforest
 * grove's gnarled variant). Data-driven — no hardcoded biome names here.
 *
 * When the rule names an id the descriptor does not define, fall back to the
 * hash roll so a partially-migrated descriptor still renders.
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
  // Biome override — a descriptor's per-biome variant wins over the rule.
  const biomeVariantId = descriptor.biomeVariants?.[tile.biomeId];
  if (biomeVariantId) {
    const biomeVariant = byId(biomeVariantId);
    if (biomeVariant) return biomeVariant;
  }
  const rule = descriptor.variantRule;
  if (rule === 'cluster') {
    const id = tile.terrain === 'denseForest' ? 'tall' : 'round';
    return byId(id) ?? variants[((tileH % variants.length) + variants.length) % variants.length];
  }
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
