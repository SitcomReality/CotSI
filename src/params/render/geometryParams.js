/**
 * geometryParams.js — All 3D geometry dimensions for features and units.
 * Grouped by type into exported objects.
 */

// ── Tree geometries ──
export const TREE_TRUNK = { bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 };
export const TREE_CANOPY_ROUND = { radius: 0.30, wSegs: 6, hSegs: 4 };
export const TREE_CANOPY_TALL = { bottomR: 0.25, height: 0.72, radialSegs: 6, heightSegs: 2 };
export const TREE_CANOPY_WIDE = { bottomR: 0.45, height: 0.30, radialSegs: 6, heightSegs: 1 };

export const TREE_VARIANT_HASH_SEEDS = [7, 13, 31, 17];
export const TREE_FOREST_TALL_THRESHOLD = 10;
export const TREE_VARIANT_THRESHOLDS = [6, 11]; // round/tall/wide thresholds for non-forest

export const TREE_TALL = { heightOffset: 0.65, canopyY: 0.58 };
export const TREE_WIDE = { heightOffset: 0.55, canopyY: 0.45 };
export const TREE_ROUND = { heightOffset: 0.50, canopyY: 0.50 };

export const TREE_TRUNK_Y_FRACTION = 0.4;

// ── Tree cluster + solitary layout ──
// Every forest/denseForest tile renders a scattered grove (its terrain
// decoration); lone trees on open ground render one bigger, more distinctive
// tree. All values are deterministic per tile.

/** Min/max cluster size by terrain — count scales with the tile's density. */
export const TREE_CLUSTER_COUNTS = { forest: [3, 5], denseForest: [4, 7] };
/** Ring radii (world units, hex radius = 1.0) inside which cluster trees sit. */
export const TREE_CLUSTER_RING = { min: 0.18, max: 0.55 };
/** Outward-lean range (radians) — cluster trees lean away from the hex center. */
export const TREE_CLUSTER_LEAN = { min: 0.045, max: 0.12 };

/** Per-tree variation ranges for cluster trees. */
export const TREE_VARIATION = {
  scaleMin:        1.3,    // overall size relative to cluster base (1.0); floor raised so
  scaleMax:        1.5,    // de-emphasized trees (×DISPERSED_SCALE) stay readable (≥ ~0.8)
  stretchYMin:     0.85,   // canopy height multiplier
  stretchYMax:     1.3,
  stretchXZMin:    0.9,    // canopy width multiplier
  stretchXZMax:    1.15,
  trunkStretchMin: 0.9,    // trunk height/width multiplier
  trunkStretchMax: 1.2,
  colorJitter:     0.05,   // ± brightness jitter for cluster leaf color
  ringJitter:      0.15,   // ± fraction of ring width for radial scatter
  angleJitter:     0.7,    // ± radians of angular scatter around even spacing
};

/** Solitary-tree treatment (individual trees). */
export const TREE_SOLITARY = {
  tree: { scale: 1.15, stretchY: 1.1, stretchXZ: 1.05, lean: 0.02 },
};

/** Canopy palette — applied per instance (material stays white). */
export const TREE_CANOPY_COLORS = {
  round: 0x3CB371,
  tall:  0x2E8B57,
  wide:  0x66CDAA,
  painforest: 0x2E5D2E, // Painforest grove — dark twisted foliage
};

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
