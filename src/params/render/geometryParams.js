/**
 * geometryParams.js — All 3D geometry dimensions for features and units.
 * Grouped by type into exported objects.
 */

// ── Tree variant hash seeds ──
// Shared by tileHash.js (treeHash) for deterministic per-tile grove/decor rolls.
export const TREE_VARIANT_HASH_SEEDS = [7, 13, 31, 17];

// ── Decoration de-emphasis (dispersal/sinking) ──
// When a tile's center is claimed by an occupant (champion/mob/trader) or a
// feature, decorations are pushed aside instead of removed. Values are world
// units (hex radius = 1.0) unless noted.
export const DECOR_DEEMPHASIS = {
  scale: 0.62,          // × multiplier on a dispersed item's scale (single or cluster)
  singleCorner: 3,      // hexCornersXZ index — upper-left corner, the shared "moved aside" anchor
  singleInset: 0.62,    // × hex radius: single items sit at corner × this inset
  ringMin: 0.68,        // dispersed multi-item ring inner radius (near the hex edge)
  ringMax: 0.88,        // dispersed multi-item ring outer radius
  sinkScale: 0.55,      // sunk (hill) decorations scale to this fraction
  sinkDepth: 0.35,      // world units a sunk decoration descends below the surface
};

// ── Hill decoration ──
// A low flattened dome on every hill tile — the terrain decoration for hill
// terrain. It cannot spread out, so de-emphasis sinks it below the surface.
export const HILL_DECOR = {
  radius: 0.42,         // mound radius (hex radius = 1.0)
  height: 0.28,         // mound height
  color: 0x7A8F5A,      // mossy hill-green tint
};

// ── Mountain geometries ──
/** Base hexagon radius — must match hexCornersXZ so adjacent mountains tile with no gaps. */
export const MOUNTAIN_BASE_RADIUS = 1.0;
export const MOUNTAIN_CAP_RADIUS = 0.45;
export const MOUNTAIN_CAP_HEIGHT = 1.2;
export const MOUNTAIN_TIP_HEIGHT = 1.8;
/** Dark slate body — deliberately much darker than the terrain it sits on so the massif reads as a distinct 3D form. */
export const MOUNTAIN_BODY_COLOR = [0.28, 0.31, 0.36];
/** Bright cool white cap — pops against the dark body under warm sun light. */
export const MOUNTAIN_CAP_COLOR = [0.92, 0.96, 1.0];

/** Small ring just below the tip point — gives the very summit its own colorable band. */
export const MOUNTAIN_TIP_RING_RADIUS = 0.12;
export const MOUNTAIN_TIP_RING_HEIGHT = 1.6;
/** The tip's own color — starts identical to the cap so it's invisible until tuned. */
export const MOUNTAIN_TIP_COLOR = [0.92, 0.96, 1.0];

/** Per-tile profile variants, chosen by `hash % MOUNTAIN_VARIANTS.length`. */
export const MOUNTAIN_VARIANTS = ['classic', 'offpeak'];
/** Asymmetric peak — cap ring + tip shift toward one corner, making one flank steep. */
export const MOUNTAIN_OFFPEAK = {
  direction: Math.PI / 6, // radians — toward a corner, between two edges
  offset: 0.22,           // cap/tip shift from the hex center
  capRadius: 0.38,        // smaller cap under the offset tip
};

export const MOUNTAIN_HASH_SEEDS = [13, 7, 19, 100];
// The MOUNTAIN_PEAK/SLOPE/NORMAL_SCALE* below apply to the game-layer
// mountainType tags ('peak' = tall center of a group, 'slope' = foothills),
// not to the geometry tip.
export const MOUNTAIN_PEAK_SCALE = 1.3;
export const MOUNTAIN_PEAK_SCALE_RANGE = 15;
export const MOUNTAIN_SLOPE_SCALE = 0.7;
export const MOUNTAIN_SLOPE_SCALE_RANGE = 15;
export const MOUNTAIN_NORMAL_SCALE = 0.9;
export const MOUNTAIN_NORMAL_SCALE_RANGE = 25;

// ── Simple-feature scatter jitter constants ──
// Deterministic hash/scale constants that scatter simple features (and the
// shared tuft geometry) across their hex in simpleFeatureMeshes.js.
export const TUFT = { bottomR: 0.04, height: 0.06, segments: 3 };

export const SCATTER_HASH_SEEDS = [17, 11, 13, 100];
export const SCATTER_ANGLE_STEP = 0.618;
export const SCATTER_OFFSET_MIN = 0.15;
export const SCATTER_OFFSET_RANGE = [30, 200]; // max = offsetMin + (range[0]-1)/range[1]
export const SCATTER_ROTATION_SEED = 0.723;
export const SCATTER_SCALE_BASE = 0.8;
export const SCATTER_SCALE_RANGE = [20, 100];

// ── Knot geometries ──
export const KNOT_RADIUS = 0.2;
export const KNOT_Y_OFFSET = 0.30;
export const KNOT_EMISSIVE_INTENSITY = 0.4;

// ── Unit geometries (champions, pieces, mobs) ──
// Champion body/head and the mob archetype bodies live in the descriptor
// data (worldObjects/descriptors/data/champion.js + mob.js).

/** Mob body tint — faction base color darkened channel-wise by this factor. */
export const MOB_COLOR_DARKEN = 0.7;
