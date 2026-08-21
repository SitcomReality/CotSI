/**
 * terrainParams.js — Terrain elevation, color values, and shared world-space constants.
 */

/** World-space hex radius (shared with hexWorldSpace.js). */
export const HEX_RADIUS = 1.0;

/** Hex tile thickness (board-game-piece edge height). */
export const HEX_THICKNESS = 1.25;
/** Side-face darken factor. */
export const SIDE_DARKEN_FACTOR = 0.5;

/** Lake color multipliers (applied to water tile base color). */
export const LAKE_COLOR_MODULATION = { r: 0.7, g: 0.85, b: 0.9 };

/**
 * Biome edge blending strength. Each top-face corner is pulled toward the
 * average color of the tiles sharing that corner (0 = no blending, 1 = corner
 * becomes the full average). Blends adjacent biomes into a soft gradient.
 * Water never participates: water tiles render on their own mesh with no corner
 * blending, and land corners skip water neighbors (see cornerBlend.js).
 */
export const TERRAIN_BLEND_FACTOR = 0.8;

/**
 * Water surface ripple (vertex-shader animation, see buildWaterMesh.js).
 * Displaces water vertices by sin(uTime * SPEED + phase) * amp, where phase and
 * amp are per-corner attributes: most corners have amp 0 (still water), a
 * scattered COVERAGE fraction bobs slightly so the surface is never perfectly
 * still. All GPU-side — one uTime uniform per frame.
 */
export const WATER_RIPPLE_SPEED = 2.0;
export const WATER_RIPPLE_AMP = 0.03;
export const WATER_RIPPLE_COVERAGE = 0.3;

/**
 * Water surface chop (fragment-shader shading animation, see materials.js).
 * Three crossed animated sine trains perturb the water fragment normals, so
 * the toon ramp renders them as drifting light/dark patches — a field of
 * gentle non-directional ripples on large water bodies. Pure per-pixel math;
 * no geometry, draw-call, or attribute changes.
 */
export const WATER_CHOP_FREQ_1 = 1.9;    // rad per world unit, train 1
export const WATER_CHOP_DIR_1 = [0.90, 0.35];
export const WATER_CHOP_FREQ_2 = 2.7;
export const WATER_CHOP_DIR_2 = [-0.40, 0.85];
export const WATER_CHOP_FREQ_3 = 3.7;
export const WATER_CHOP_DIR_3 = [0.50, -0.80];
export const WATER_CHOP_SPEED = 1.1;     // phase speed multiplier (uTime)
export const WATER_CHOP_STRENGTH = 0.35; // normal-perturb strength (view-space)

/** Full river blue for carved channel floors (rendered on the water mesh). */
export const RIVER_COLOR = [0.176, 0.529, 0.902];

/** River flow wave (vertex-shader, downstream-traveling) controls. */
export const WATER_FLOW_SPEED = 2.5;
export const WATER_FLOW_WAVE_LENGTH = 2.5;
export const WATER_FLOW_AMP = 0.04;

/** Damp-bank tint for land side faces adjacent to water or a river channel. */
export const SIDE_WATER_TINT_COLOR = [0.10, 0.28, 0.42];
export const SIDE_WATER_TINT_WEIGHT = 0.55;

/**
 * Sparkle glints on still water (InstancedMesh accents, see waterSparkles.js).
 * Small unlit stars twinkle above the surface and bob with the same ripple
 * phase/amplitude as the water beneath them.
 */
export const SPARKLE_DENSITY = 1.0;
export const SPARKLE_SIZE = 0.10;
export const SPARKLE_COLOR = [0.85, 0.95, 1.0];
export const SPARKLE_TWINKLE_SPEED = 3.0;
export const SPARKLE_TWINKLE_AMP = 0.45;
/** Hover height above the water top face — clears the ripple envelope (max
 * displacement WATER_RIPPLE_AMP = 0.03, plus the sparkle's own bob), so glints
 * never clip into the surface. */
export const SPARKLE_Y_OFFSET = 0.06;

/**
 * Terrain fill colors (RGB 0-1 tuples for vertex color attributes).
 * Base color per terrain type; biomes can override per-tile via palette.
 */
export const TERRAIN_COLOR = {
  plains:        [0.455, 0.678, 0.365],  // #74ad5d — vibrant meadow green
  forest:        [0.294, 0.557, 0.255],  // #4b8e41 — deep vivid forest
  deepWood:   [0.176, 0.420, 0.137],  // #2d6b23 — dark rich green
  desert:        [0.839, 0.694, 0.357],  // #d6b15b — warm golden sand
  marsh:         [0.506, 0.600, 0.404],  // #819967 — murky vibrant marsh
  mountain:      [0.529, 0.486, 0.416],  // #877c6a — rocky warm gray
  water:         [0.157, 0.376, 0.545],  // #285f8b — deep ocean blue
  ice:           [0.649, 0.820, 0.957],  // #a6d1f4 — pale ice blue
  beach:         [0.910, 0.847, 0.627],  // #e8d8a0 — warm sand
  river:         [0.176, 0.529, 0.902],  // RIVER_COLOR — flowing channel blue
};

/**
 * Terrain elevation values (Y offset for each terrain type).
 * Applied during terrain mesh generation.
 */
export const TERRAIN_ELEVATION = {
  plains: 0,
  forest: 0.15,
  deepWood: 0.20,
  desert: 0,
  marsh: -0.05,
  beach: -0.05,
  hill: 0.25,
  plateau: 0.70,
  mountain: 0.85,
  water: -0.15,
  ice: -0.12,
  // River's table value is transient — carveRiverBeds() sets the real channel
  // elevation below the banks. This entry only keeps resolveElevation() quiet.
  river: -0.05,
};

/**
 * Hit-test tolerance (fraction of hex radius) for terrain picking.
 * Used in hexPicking.js
 */
export const PICK_TOLERANCE_FRACTION = 0.9;
