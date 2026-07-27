/**
 * theme.js — Rendering constants for the analysis page.
 *
 * Single source of truth for all colors, sizes, and stroke widths
 * used by the map renderer. Edit here to tweak the visual palette
 * without digging through rendering code.
 */

// ── View-mode biome colors ──────────────────────────────────────────────────────

export const BIOME_COLORS = {
  default: '#6a9a4a',
  lush: '#3a7a2a',
  arid: '#c8a050',
  /** Fallback for unknown biome IDs */
  fallback: '#888',
};

// ── Entity markers ──────────────────────────────────────────────────────────────

export const BASE_MARKER = {
  /** Half-side of the square in hex-pixels */
  halfSize: 3,
  strokeWidth: 0.5,
};

export const MOB_MARKER = {
  radius: 2.5,
  color: '#8B6914',
};

export const TRADER_MARKER = {
  radius: 3,
  color: '#20b2aa',
};

export const CHAMP_MARKER = {
  radius: 3.5,
  fillOutline: '#fff',
  strokeWidth: 0.8,
};

// ── Feature markers ─────────────────────────────────────────────────────────────

/**
 * Each entry maps a tile.feature.kind to its drawing parameters.
 *
 * - radius: circle radius in hex-pixels
 * - fill:   fill color
 * - Additional keys are used by specific feature kinds
 *   (crossStroke, crossWidth, crossLen for fruitTree;
 *    ringStroke, ringWidth for vine)
 */
export const FEATURES = {
  tree:      { radius: 1.5, fill: '#2d5a1e' },
  fruitTree: { radius: 1.8, fill: '#3a8a2a', crossStroke: '#60c040', crossWidth: 0.8, crossLen: 1.2 },
  largeTree: { radius: 2.5, fill: '#1d4a0e' },
  knot:      { radius: 1.8, fill: '#c8a832' },
  bush:      { radius: 1.2, fill: '#5a8a3a' },
  vine:      { radius: 1.0, fill: '#4a7a2a', ringStroke: '#6aaa4a', ringWidth: 0.5 },
};

// ── Debris markers ──────────────────────────────────────────────────────────────

export const DEBRIS = {
  tuft:   '#5a7a3a',
  rock:   '#777',
  flower: '#c878a0',
};

/** Half-side of the debris square in hex-pixels */
export const DEBRIS_SIZE = 1;

// ── Viewport culling ────────────────────────────────────────────────────────────

/** Margin (in hex sizes) outside the viewport still rendered */
export const CULL_MARGIN = 2;
