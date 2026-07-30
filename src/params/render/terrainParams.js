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

/** River overlay color (RGB 0-1) blended into top face of river-path tiles. */
export const RIVER_OVERLAY_COLOR = [0.118, 0.471, 0.863];
/** Blend weight for river overlay on top face (0 = no river, 1 = pure river color). */
export const RIVER_OVERLAY_WEIGHT = 0.45;

/**
 * Terrain elevation values (Y offset for each terrain type).
 * Applied during terrain mesh generation.
 */
export const TERRAIN_ELEVATION = {
  plains: 0,
  forest: 0.15,
  denseForest: 0.20,
  desert: 0,
  marsh: -0.05,
  beach: -0.05,
  mountain: 0.6,
  peak: 1.0,
  floatingIsland: 2.5,
  water: -0.15,
  ice: -0.12,
};

/**
 * Hit-test tolerance (fraction of hex radius) for terrain picking.
 * Used in hexPicking.js
 */
export const PICK_TOLERANCE_FRACTION = 0.9;
