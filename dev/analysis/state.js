/**
 * state.js — Shared mutable state for the analysis page UI.
 *
 * Other modules import `S` and read/write its properties directly.
 * No local project imports — a true leaf module.
 */

export const S = {
  /** { tiles, champions, mobs, traders, baseKeys, biomeDef, radius, seed } or null */
  lastResult: null,

  /** Camera state for the hex map canvas: { x, y, zoom } */
  camera: { x: 0, y: 0, zoom: 1 },

  /** The <canvas> element and its 2D rendering context */
  canvasEl: null,
  ctx: null,

  /** Current view mode: 'terrain' | 'biome' | 'elevation' | 'moisture' | 'baseMoisture' | 'passability' | 'rivers' | 'distributions' | 'blank' */
  viewMode: 'terrain',

  // ── Random cycle state ─────────────────────────────────────────────────

  /** setInterval ID for the random cycle, or null */
  cycleIntervalId: null,

  /** Whether the random cycle is currently running */
  cycleOn: false,

  // ── Canvas drag / pan state ────────────────────────────────────────────

  /** Whether the user is currently dragging the map */
  isDragging: false,

  /** Mouse position at drag start (client coords) */
  dragStart: { x: 0, y: 0 },

  /** Camera position at drag start */
  dragCameraStart: { x: 0, y: 0 },
};
