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
   * Growth-state keyframe the preview shows and the inspector edits: 1 =
   * "full" (the part's authored base values), 0 = "empty" (the `states.empty`
   * keyframe, if the part carries one). See partStates.js — tile-driven
   * features regrow one step per day toward growth 1 in-game.
   */
  growth: 1,

  /**
   * Biome id for the preview tile (e.g. 'biome_edenfall'), or null for a plain
   * tile. Sets the per-part biomeScale (stunted Tundra trees, small Painforest
   * groves) and the biome-color influence preview (Edenfall purple leaves).
   */
  biomeId: null,

  /**
   * Whether the preview renders an entity (base/champion/mob/trader).
   * `faction` picks the faction variant + palette; `archetype` picks the shape
   * variant for archetype-rule descriptors (mobs).
   */
  entity: { faction: 'CRU', archetype: null },

  /**
   * Tile-strip diversity view (decorComposition.md §6.3): when true the
   * preview renders a 3×3 neighborhood of real hexes instead of one tile, and
   * the histogram beside it tallies motif draws over 64 hashes. `stripOffset`
   * is the scrub-seed slider — land on (and away from) ugly hashes.
   */
  strip: false,
  stripOffset: 0,

  /** Part id currently selected in the parts list, or null */
  selectedPartId: null,

  /**
   * Per-node alternatives preview overrides: alternatives node id → forced
   * option id (the inspector's preview radios, decorComposition.md §6.2).
   * Empty = hash-driven rolls.
   */
  previewOptions: new Map(),

  /**
   * Selected variant id for tile-driven descriptors (features/decor/mountain)
   * that define variants: the preview and parts list edit this variant.
   * null → the first variant. Entity kinds ignore this — their variant comes
   * from `entity` (faction/archetype).
   */
  variantId: null,

  /**
   * When editing a shared library motif, `{ id }` of the motif block currently
   * open in the editor. The editor wraps the motif into a synthetic decor (see
   * motifDescriptor in sampleObjects.js) so the standard part-tree/inspector/
   * preview machinery edits it; this marker makes the save path emit a
   * data/motifs/<id>.js module instead of a descriptor module. null = editing a
   * normal descriptor (or none).
   */
  motifEditing: null,
};
