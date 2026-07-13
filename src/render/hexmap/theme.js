// Design tokens for the hex map — parchment-fantasy palette
// Extracted from renderer.js to keep visual tuning in one place

// ── Background ──
export const BG_GRADIENT_STOPS = [
  { offset: '0%',  color: '#f7e9c6' },
  { offset: '55%', color: '#ead6a8' },
  { offset: '100%',color: '#d8c089' },
];
export const BG_RADIAL_CX = '50%';
export const BG_RADIAL_CY = '0%';
export const BG_RADIAL_R  = '800px 500px';

// ── Parchment pattern ──
export const PARCHMENT_BASE     = '#ead6a8';
export const PARCHMENT_SPECKLE1 = '#d4b87a44';
export const PARCHMENT_SPECKLE2 = '#bfa06633';

// ── Hex tiles ──
export const HEX_FILL_VISIBLE   = 0.98;
export const HEX_FILL_DIMMED    = 0.52;
export const HEX_FILL_FOG       = '#d8c8a7';  // explored but not visible

export const HEX_STROKE_NORMAL    = '#8a6740';
export const HEX_STROKE_FOG       = '#6a4a2a';
export const HEX_STROKE_REACHABLE = '#b88728';

export const HEX_STROKE_WIDTH_NORMAL    = 1.2;
export const HEX_STROKE_WIDTH_FOG       = 0.8;
export const HEX_STROKE_WIDTH_REACHABLE = 2.8;

// ── Terrain mark ──
export const TERRAIN_MARK_COLOR   = '#5a3a22';
export const TERRAIN_MARK_OPACITY = 0.5;

// ── Fog overlay ──
export const FOG_FILL    = '#1a140a';
export const FOG_OPACITY = 0.22;

// ── Shadow color (used consistently for all drop-shadows) ──
export const SHADOW_COLOR = '#1a140a';

// ── Mountains ──
export const MOUNTAIN_BODY_FILL  = 'url(#mountainTex)';
export const MOUNTAIN_BODY_INK   = '#7a6a50';
export const MOUNTAIN_HIGHLIGHT  = '#c8b8a0';
export const MOUNTAIN_SNOW       = '#f0f0f0';
export const MOUNTAIN_SHADOW_OPACITY = 0.18;

// ── Trees ──
export const TREE_TRUNK_RIPE   = '#5a3a22';
export const TREE_TRUNK_BARE   = '#7a5a3a';
export const TREE_CANOPY_RIPE  = 'url(#treeGrad)';
export const TREE_CANOPY_BARE  = '#6a8a5a';
export const TREE_FRUIT_COLOR  = '#ffd86b';
export const TREE_SHADOW_OPACITY = 0.15;

// ── God's Knot ──
export const KNOT_BODY    = '#7c3fb1';
export const KNOT_GLOW    = '#b79aff';
export const KNOT_INNER   = '#e8d0ff';
export const KNOT_SHADOW_OPACITY = 0.12;

// ── Bases (faction structures) ──
export const BASE_SHADOW_OPACITY = 0.18;

// ── Units ──
export const MOB_SHADOW_OPACITY   = 0.15;
export const TRADER_SHADOW_OPACITY= 0.12;
export const CHAMP_SHADOW_OPACITY = 0.18;

export const MOB_TEXT_COLOR    = 'white';
export const MOB_OUTLINE_COLOR = '#21150d';

export const TRADER_BODY  = '#4abf9a';
export const TRADER_STROKE = '#145a44';

export const CHAMP_HALO_COLOR      = '#ffd86b';
export const CHAMP_ACTIVE_STROKE   = '#fff3bf';
export const CHAMP_INACTIVE_STROKE = '#21150d';

// ── HP bar ──
export const HP_BAR_BG     = '#3a1a1a';
export const HP_BAR_FILL   = '#5fc98a';
export const HP_BAR_GRADIENT = 'url(#treeGrad)';
export const HP_TEXT_SHADOW = '1px 1px 2px #000';
export const HP_CHAMP_BAR_Y_OFFSET = 0.9;  // multiple of HEX_SIZE above center
export const HP_MOB_BAR_Y_OFFSET  = 0.7;

// ── Hotbar reachable glow ──
export const REACHABLE_GLOW_COLOR  = 'rgba(255, 216, 107, 0.18)';