/**
 * theme.js — Rendering constants for the analysis page.
 *
 * This file holds visual constants for **entity markers, feature markers,
 * debris markers, biome overlay colors, and viewport culling margin**.
 *
 * It is NOT the source for elevation or moisture color maps — those live
 * in `colorMaps.js` (alongside the legend stops). Edit there to change
 * the overlay gradient palette.
 *
 * Edit here to tweak marker sizes, entity colors, and biome region tints
 * without digging through rendering code.
 */

// ── View-mode biome colors ──────────────────────────────────────────────────────

export const BIOME_COLORS = {
  default:  '#7aba5a',   // Untouched — bright vibrant grass green
  painforest:   '#2d6a2a',   // Painforest — deep forest green
  sere_wastes:  '#b89838',   // Sere Wastes — sandy gold
  scorch:       '#c97a2d',   // Scorch — burnt orange
  edenfall:     '#8a4a9a',   // Edenfall — purple (distinctive, keep)
  dustbleed:    '#8b2a2a',   // Dustbleed — deep rusty blood-red (distinctive)
  brass_grave:  '#8a7a40',   // Brass Grave — olive-brass
  frigid_silence: '#6ab0d0', // Frigid Silence — icy blue
  mourning_marsh: '#4a7a5a', // Mourning Marsh — muted green
  unfinished_lands: '#b0a090', // Unfinished Lands — warm taupe-grey
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

  // Tier 1 features
  palimpsestSlab:      { radius: 2.0, fill: '#c8c0a8' },
  volvelle:            { radius: 2.0, fill: '#d4b830' },
  foolsFire:           { radius: 1.5, fill: '#40d0e0' },
  placeholderCypress:  { radius: 1.8, fill: '#3a5a2a' },
  vegetableLamb:       { radius: 1.8, fill: '#c0d8a0' },
  scoriaRose:          { radius: 1.5, fill: '#e87030' },
  waxbloom:            { radius: 1.5, fill: '#a0d8e8' },
  errataSlip:          { radius: 2.0, fill: '#f0e8d0' },
  redLetterBramble:    { radius: 1.8, fill: '#1a1010' },

  // Tier 2 features
  gildedInitial:       { radius: 2.5, fill: '#d8b830' },
  peridexionTree:      { radius: 2.5, fill: '#1a5a0a' },
  listenerLichen:      { radius: 1.5, fill: '#80c0a0' },
  saintsRib:           { radius: 3.0, fill: '#e8e0d0' },
  drownedCopyist:      { radius: 2.0, fill: '#405868' },
  censerSaint:         { radius: 2.0, fill: '#b89840' },
  screamroot:          { radius: 1.5, fill: '#682040' },
  nullLily:            { radius: 1.5, fill: '#e0e0e8' },
  halfDrawnObelisk:    { radius: 2.5, fill: '#a0a098' },
  witnessStone:        { radius: 2.0, fill: '#b0a890' },
  cinderbloom:         { radius: 1.5, fill: '#e88040' },
  brassLungVent:       { radius: 1.8, fill: '#a08050' },
  ouroborosLoop:       { radius: 2.0, fill: '#c8a020' },
  dustbleedCrystal:    { radius: 2.0, fill: '#40c8b8' },  // turquoise crystal
};

// ── Debris markers ──────────────────────────────────────────────────────────────

export const DEBRIS = {
  tuft:   '#5a7a3a',
  rock:   '#777',
  flower: '#c878a0',
};

/** Half-side of the debris square in hex-pixels */
export const DEBRIS_SIZE = 1;

// ── River overlay ──────────────────────────────────────────────────────────

/** Radius (in hexes) for river moisture boost — used to compute the boost halo. */
export const RIVER_BOOST_RADIUS = 1;

export const RIVER = {
  /** Semi-transparent blue fill for moisture-boosted tiles (halo). */
  boostColor: 'rgba(64, 160, 255, 0.12)',
  /** Brighter blue fill for river-path tiles. */
  pathColor: 'rgba(30, 120, 220, 0.7)',
};

// ── Viewport culling ────────────────────────────────────────────────────────────

/** Margin (in hex sizes) outside the viewport still rendered */
export const CULL_MARGIN = 2;
