/**
 * overlayParams.js — Fog overlay, interaction highlights, and selection ring parameters.
 */

// ── Fog of war ──
export const CAMERA_HASH_PRECISION = 10;
export const FOG_BLUR_RADIUS = 12;
export const EXPLORED_PUNCH_ALPHA = 0.30;
export const OFFSCREEN_CULL_MARGIN_PX = 100;

// ── Interaction highlights (hover, trade ring) ──
export const HIGHLIGHT_RADIUS_FRAC = 0.92;
export const TEETH_PER_EDGE = 1;
export const TEETH_BASE_WIDTH_FRAC = 0.08;
export const TEETH_BASE_HEIGHT = 0.12;
export const TEETH_EXTRA = 0.14;
export const TEETH_SPEED = 0.003;

export const RING_BASE_RADIUS_FRAC = 0.60;
export const RING_LINE_WIDTH_FRAC = 0.08;
export const RING_PULSE_SPEED = 0.003;
export const RING_PULSE_AMPLITUDE = 0.10;
export const RING_BACKING_OFFSET_PX = 2;
export const RING_BACKING_WIDTH_OFFSET_PX = 4;
export const TRADE_RING_ALPHA = 0.85;

export const HOVER_ALPHA = 0.30;
export const HIGHLIGHT_Y_OFFSET = 0.06;

// ── Movement highlights ──
export const MOVE_ALLOWED_WIDTH = 2;
export const MOVE_HOVER_WIDTH = 3;
/** Dash pattern for the movement-highlight stroke (screen px). */
export const MOVE_DASH = [6, 4];
/** Dash march speed (px per ms of clock time). */
export const MOVE_DASH_SPEED = 0.02;

// ── Selection ring ──
export const ORBIT_FRAC = 0.50;
export const SELECTION_RING_SPEED = 0.002;
export const TRI_HALF_BASE = 0.14;
export const TRI_HEIGHT = 0.22;
export const SELECTION_RING_Y_OFFSET = 0.18;
export const SELECTION_RING_ALPHA = 0.85;
export const SELECTION_RING_BACKING_OFFSET_PX = 2;
