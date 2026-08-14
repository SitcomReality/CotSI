/**
 * state.js — Shared mutable state for the geometry editor page.
 *
 * Other modules import `S` and read/write its properties directly.
 * No local project imports — a true leaf module.
 */

export const S = {
  /** Currently selected, normalized descriptor (schema.js), or null */
  descriptor: null,

  /** Tile hash — drives all per-tile variation (cluster count, size, scatter) */
  tileH: 1,

  /** Whether the hex center is claimed by an occupant (displacement demo) */
  displaced: false,

  /**
   * Canonical preview — the base parts at count 1, authored scale, centered,
   * no stretch/color jitter: the variation-free "default" look of an object.
   */
  canonical: false,

  /**
   * Whether the preview renders the game's ink outlines (inverted-hull twins —
   * see src/render/hexmap3d/scene/outline.js, aestheticConventions §11).
   */
  outlines: false,

  /**
   * Biome id for the preview tile (e.g. 'biome_edenfall'), or null for a plain
   * tile. Sets the per-part biomeScale (stunted Tundra trees, small Painforest
   * groves) and the biome-color influence preview (Edenfall purple leaves).
   */
  biomeId: null,

  /**
   * Entity selection for entity-driven descriptors (base/champion/mob/trader).
   * `faction` picks the faction variant + palette; `archetype` picks the shape
   * variant for archetype-rule descriptors (mobs).
   */
  entity: { faction: 'CRU', archetype: null },

  /** Part id currently selected in the parts list, or null */
  selectedPartId: null,

  /**
   * Selected variant id for tile-driven descriptors (features/decor/mountain)
   * that define variants: the preview and parts list edit this variant.
   * null → the first variant. Entity kinds ignore this — their variant comes
   * from `entity` (faction/archetype).
   */
  variantId: null,
};
