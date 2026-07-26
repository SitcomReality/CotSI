/**
 * uiParams.js — Panel dimensions, icon sizes, SVG widget sizes, and animation timings for the UI layer.
 */

// ── HUD ──
export const TOAST_DURATION_MS = 1800;
export const END_TURN_PULSE_MS = 160;

// ── Heptagram SVG widget ──
export const HEPTAGRAM_SELECTED_RADIUS = 17;
export const HEPTAGRAM_RADIUS = 14;
export const HEPTAGRAM_SELECTED_STROKE = 2.5;
export const HEPTAGRAM_STROKE = 1.6;

// ── Paley SVG ──
export const PALEY_SVG_WIDTH = 300;
export const PALEY_SVG_HEIGHT = 250;
export const PALEY_RADIUS_FACTOR = 0.32;
export const PALEY_CENTER_Y_OFFSET = 4;
export const PALEY_NODE_RADIUS_SEL = 17;
export const PALEY_NODE_RADIUS = 14;
export const PALEY_NODE_STROKE_SEL = 2.5;
export const PALEY_NODE_STROKE = 1.6;
export const PALEY_GLYPH_SIZE = 14;
export const PALEY_ICON_SIZE_HALF = 7;
export const PALEY_LABEL_OFFSET = 28;
export const PALEY_LABEL_FONT_SIZE = 9;
export const PALEY_EDGE_STRIDES = [1, 2, 4];

// ── Default SVG icon size ──
export const DEFAULT_ICON_SIZE = 14;

// ── Weather display ──
export const WEATHER_FOG_VIEWBOX = 84;
export const WEATHER_FOG_PATTERN_SIZE = 84;
export const WEATHER_FOG_STROKE = 2;
export const WEATHER_CORNER_ICON_SIZE = 36;

// ── Setup heptagram icon sizes ──
export const TRAIT_ICON_SIZE = 11;
export const CTRL_BADGE_ICON_SIZE = 12;
export const ROSTER_GLYPH_SIZE = 28;
export const LOCK_OVERLAY_ICON_SIZE = 18;

// ── Header / detail card ──
export const DETAIL_CARD_MIN_WIDTH = 180;
export const DETAIL_CLOSE_DELAY_MS = 150;

// ── Potency bar ──
export const POTENCY_BAR_SCALE = 6;

// ── Log panel ──
export const MAX_LOG_DISPLAY_ENTRIES = 20;
export const LOG_COLUMN_COUNT = 5;
export const LOG_ICON_SIZE = 14;
export const LOG_TEXTAREA_ROWS = 12;

// ── Modal icon sizes ──
export const DISPATCH_GLYPH_SIZE = 22;
export const DISPATCH_STAT_CARD_ICON_SIZE = 20;
export const DISPATCH_LINE_ICON_SIZE = 16;

export const REWARD_BADGE_ICON_SIZE = 14;
export const REWARD_EFFECT_ICON_SIZE = 18;
export const REWARD_CHOICE_ICON_SIZE = 12;

// ── Modal reveal timings (ms) ──
export const DISPATCH_REVEAL_MS = 650;
export const HERALD_REVEAL_MS = 650;

// ── Runtime timing ──
export const SETUP_DEFER_MS = 50;
export const BOT_AUTO_DELAY_MS = 100;
export const ANIMATION_CUSHION_MS = 30;

// Tooltip
export const TOOLTIP_CURSOR_OFFSET = 12;

// Overlay z-ordering priorities
export const OVERLAY_Z = {
  terrain: 0,
  highlight: 5,
  selection: 7,
  fog: 10,
};
