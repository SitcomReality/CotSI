/**
 * geometryParams.js — All 3D geometry dimensions for features and units.
 * Grouped by type into exported objects.
 */

// ── Tree geometries ──
export const TREE_TRUNK = { bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 };
export const TREE_CANOPY_ROUND = { radius: 0.30, wSegs: 6, hSegs: 4 };
export const TREE_CANOPY_TALL = { bottomR: 0.25, height: 0.65, radialSegs: 6, heightSegs: 2 };
export const TREE_CANOPY_WIDE = { bottomR: 0.45, height: 0.30, radialSegs: 6, heightSegs: 1 };

export const TREE_VARIANT_HASH_SEEDS = [7, 13, 31, 17];
export const TREE_FOREST_TALL_THRESHOLD = 10;
export const TREE_VARIANT_THRESHOLDS = [6, 11]; // round/tall/wide thresholds for non-forest

export const TREE_TALL = { heightOffset: 0.65, canopyY: 0.55 };
export const TREE_WIDE = { heightOffset: 0.55, canopyY: 0.45 };
export const TREE_ROUND = { heightOffset: 0.50, canopyY: 0.50 };

export const TREE_TRUNK_Y_FRACTION = 0.4;

// ── Tree cluster + solitary layout ──
// Forest/woods tiles render a cluster of trees scattered inside the hex;
// individual trees (largeTree, fruitTree, lone tree on open ground) render
// one bigger, more distinctive tree. All values are deterministic per tile.

/** Min/max cluster size by terrain — count scales with the tile's density. */
export const TREE_CLUSTER_COUNTS = { forest: [3, 5], denseForest: [4, 7] };
/** Ring radii (world units, hex radius = 1.0) inside which cluster trees sit. */
export const TREE_CLUSTER_RING = { min: 0.18, max: 0.55 };
/** Outward-lean range (radians) — cluster trees lean away from the hex center. */
export const TREE_CLUSTER_LEAN = { min: 0.045, max: 0.12 };

/** Per-tree variation ranges for cluster trees. */
export const TREE_VARIATION = {
  scaleMin:        0.8,    // overall size relative to cluster base (1.0)
  scaleMax:        1.15,
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

/** Solitary-tree treatments (individual trees). */
export const TREE_SOLITARY = {
  tree:      { scale: 1.15, stretchY: 1.1,  stretchXZ: 1.05, lean: 0.02 },
  fruitTree: { scale: 1.1,  stretchY: 1.2,  stretchXZ: 1.1,  lean: 0.015 },
  largeTree: { scale: 1.8,  stretchY: 1.3,  stretchXZ: 1.15, trunkStretch: 1.2, lean: 0.0 },
};

/** Canopy palette — applied per instance (material stays white). */
export const TREE_CANOPY_COLORS = {
  round: 0x3CB371,
  tall:  0x2E8B57,
  wide:  0x66CDAA,
  large: 0x9ACD32, // Elder Tree — golden-green landmark
  fruit: 0x7CB342, // Fruit Tree — warm green
};

// ── Mountain geometries ──
export const MOUNTAIN_SNOW_RING_RADIUS = 0.45;
export const MOUNTAIN_SNOW_RING_HEIGHT = 0.8;
export const MOUNTAIN_PEAK_HEIGHT = 1.2;
export const MOUNTAIN_ROCK_COLOR = [0.55, 0.52, 0.42];
export const MOUNTAIN_SNOW_COLOR = [0.92, 0.94, 0.98];

export const MOUNTAIN_HASH_SEEDS = [13, 7, 19, 100];
export const MOUNTAIN_PEAK_SCALE = 1.3;
export const MOUNTAIN_PEAK_SCALE_RANGE = 15;
export const MOUNTAIN_SLOPE_SCALE = 0.7;
export const MOUNTAIN_SLOPE_SCALE_RANGE = 15;
export const MOUNTAIN_NORMAL_SCALE = 0.9;
export const MOUNTAIN_NORMAL_SCALE_RANGE = 25;

// ── Base geometries (faction bases) ──
export const BASE_TOWER = { bottomR: 0.22, topR: 0.25, height: 0.7, segments: 8 };
export const BASE_CAP = { bottomR: 0.24, topR: 0.2, height: 0.15, segments: 8 };
export const BASE_TOWER_Y_CENTER = 0.35;
export const BASE_CAP_Y_CENTER = 0.75;
export const BASE_CRU_SPIKE_Y = 0.15;
export const BASE_HEART_DOME = { radius: 0.18, widthSegs: 6, heightSegs: 4, phiStart: 0, phiLength: Math.PI };
export const BASE_MASK_SPIRE = { radius: 0.05, topRadius: 0.15, height: 6 };
export const BASE_HOL_SPIKE = { radius: 0.04, height: 0.12, segments: 4 };
export const BASE_SPIKE_RING_RADIUS = 0.28;
export const BASE_SPIKE_TILT_AMOUNT = 0.3;

export const BASE_SPIKE = { bottomR: 0.06, height: 0.10, segments: 4 };
export const BASE_RING = { radius: 0.28, tube: 0.02, radialSegs: 6, tubularSegs: 12 };
export const BASE_RING_DOT = { radius: 0.03, wSegs: 4, hSegs: 3 };

// ── Debris geometries ──
export const DEBRIS_TUFT = { bottomR: 0.04, height: 0.06, segments: 3 };
export const DEBRIS_ROCK_RADIUS = 0.03;
export const DEBRIS_FLOWER_RADIUS = 0.025;
/** Sun-bleached bone shard — tapered pillar, tallest at the base. */
export const DEBRIS_BONE = { topR: 0.008, bottomR: 0.02, height: 0.09, segments: 4 };
/** Faceted crystal shard — low-segment cone. */
export const DEBRIS_CRYSTAL = { radius: 0.03, height: 0.09, segments: 4 };
/** Tiny mushroom — single cone cap (stem is implicit at this scale). */
export const DEBRIS_SHROOM = { capR: 0.035, capHeight: 0.03, capSegments: 5 };
/** Fallen log — short cylinder, pre-rotated flat by the geometry factory. */
export const DEBRIS_LOG = { radius: 0.02, length: 0.12, segments: 5 };

export const DEBRIS_HASH_SEEDS = [17, 11, 13, 100];
export const DEBRIS_ANGLE_STEP = 0.618;
export const DEBRIS_OFFSET_MIN = 0.15;
export const DEBRIS_OFFSET_RANGE = [30, 200]; // max = offsetMin + (range[0]-1)/range[1]
export const DEBRIS_Y_OFFSET = 0.03;
export const DEBRIS_ROTATION_SEED = 0.723;
export const DEBRIS_SCALE_BASE = 0.8;
export const DEBRIS_SCALE_RANGE = [20, 100];

// ── Knot geometries ──
export const KNOT_RADIUS = 0.2;
export const KNOT_Y_OFFSET = 0.30;
export const KNOT_EMISSIVE_INTENSITY = 0.4;

// ── Unit geometries (champions, pieces, mobs) ──
export const CHAMPION_BODY = { bottomR: 0.08, topR: 0.12, height: 0.5, segments: 8 };
export const CHAMPION_HEAD = { radius: 0.1, wSegs: 8, hSegs: 6 };
export const CHAMPION_BODY_Y_OFFSET = 0.15;
export const CHAMPION_HEAD_Y_OFFSET = 0.45;

export const PIECE_BODY = { radiusX: 0.3, radiusY: 0.3, height: 0.10, segments: 16 };
export const PIECE_CAP = { radiusX: 0.25, radiusY: 0.25, height: 0.025, segments: 24 };
export const PIECE_BODY_Y_OFFSET = 0.05;
export const PIECE_CAP_Y_OFFSET = 0.0645; // 0.05 + 0.0125 + 0.002
export const PIECE_CAP_SPACER = 0.002;

export const PIECE_CAP_BG_COLOR = '#f0e8d0';
export const PIECE_ICON_COLOR = '#3a2a1a';
export const PIECE_TEX_SIZE = 128;
export const PIECE_BG_RADIUS_OFFSET = 2;

export const MOB_COLOR_DARKEN = 0.7;

// Mob sizes (all as [radius, ...] or box dimensions)
export const MOB_BEAR = { radius: 0.16, height: 0.18, bodyWidth: 0.28, segments: 6 };
export const MOB_LEOPARD = { radius: 0.07, height: 0.10, bodyLength: 0.50, segments: 6 };
export const MOB_SNAIL = { radius: 0.16, wSegs: 8, hSegs: 6, phiStart: 0, phiLength: Math.PI };
export const MOB_TAPIR = { radius: 0.08, height: 0.18, bodyLength: 0.42, segments: 7 };
export const MOB_MUSHROOM = { capRadius: 0.20, stemRadius: 0.14, segments: 8 };
export const MOB_GOOSE = { radius: 0.07, height: 0.50, segments: 4 };
export const MOB_SCORPION = { radius: 0.14, detail: 0 };
export const MOB_DEFAULT = { radius: 0.1, topR: 0.14, height: 0.4, segments: 8 };
