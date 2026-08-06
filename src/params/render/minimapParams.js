/**
 * minimapParams.js — Minimap canvas sizing, entity dot sizes, and layout constants.
 */

export const MINIMAP_SIZE = 200;
export const MINIMAP_PADDING = 4;
export const MINIMAP_MARGIN_PX = 12;
export const MINIMAP_BORDER_RADIUS_PX = 4;

export const MINIMAP_BASE_MARKER_SIZE = 3; // half-size (draws 6x6 rect)
export const MINIMAP_CHAMPION_DOT_RADIUS = 3;
export const MINIMAP_MOB_DOT_RADIUS = 2;
export const MINIMAP_TRADER_DOT_RADIUS = 2;
export const MINIMAP_INDICATOR_LINE_WIDTH = 1;
export const CAMERA_STRETCH_EPSILON = 0.01;

export const MINIMAP_HEX_ASPECT_RATIO = 0.75;
export const MINIMAP_EXPLORED_ALPHA = 0.3;

/**
 * Maximum zoom-out floor: a hex is never depicted smaller than this many
 * pixels. When the explored map can't fit at this scale, the minimap shows a
 * champion-centered window the size of the canvas instead of shrinking.
 */
export const MINIMAP_MIN_HEX_PX = 1;

/**
 * Below this scale (px per world unit, ≈2.6px per hex) the terrain layer
 * rebuilds the canvas pixel-by-pixel via ImageData — a fixed MINIMAP_SIZE²
 * pass — instead of drawing individual hex dots. Both paths are bounded by the
 * window, never O(explored); this picks the cheaper one at dense scales.
 */
export const MINIMAP_PIXEL_BLIT_MAX_SCALE = 1.5;
