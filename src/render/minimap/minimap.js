/**
 * minimap.js — 2D minimap overlay showing explored terrain, fog, and entity positions.
 *
 * Renders to an off-screen 2D canvas positioned over the bottom-right corner of the map.
 * The minimap is always zoomed to frame the entire explored map and is clickable to
 * center the 3D camera on the clicked location.
 *
 * Fog of war is respected: only explored hexes are shown (visible at full opacity,
 * explored-but-not-visible at reduced opacity). Unexplored areas remain dark.
 */

import { coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { centerCameraOnHex } from '../hexmap3d/hexMapRenderer.js';
import { getSceneContext } from '../hexmap3d/hexMapRenderer.js';

// ---- Constants ----
const MINIMAP_SIZE = 200; // CSS pixels (square)
const PADDING = 4;        // padding inside the minimap border
const HEX_RADIUS = 1.0;   // matches hexWorldSpace.HEX_RADIUS

// ---- Module-level state ----
let minimapEl = null;
let terrainCanvas = null;
let terrainCtx = null;
let overlayCanvas = null;
let overlayCtx = null;
let lastExploredRevision = -1;
let cachedScale = 1;
let cachedOffsetX = 0;
let cachedOffsetZ = 0;

// Callback for minimap click handler (injected by runtime/mapRefresh.js)
let _getExploredForClick = null;

// ---- Helpers ----

/**
 * Compute the bounding box of a set of hex coordinates in world space.
 * Returns { minX, maxX, minZ, maxZ }.
 */
function hexBounds(hexes) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const h of hexes) {
    const { x, z } = hexCenter(h.q, h.r);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  // Account for hex size (corners extend beyond center)
  minX -= HEX_RADIUS;
  maxX += HEX_RADIUS;
  minZ -= HEX_RADIUS;
  maxZ += HEX_RADIUS;
  return { minX, maxX, minZ, maxZ };
}

/**
 * Project a world-space (x, z) to minimap pixel coords.
 */
function worldToMinimap(x, z) {
  return {
    px: (x - cachedOffsetX) * cachedScale + PADDING,
    py: (z - cachedOffsetZ) * cachedScale + PADDING,
  };
}

// ---- Initialization ----

/**
 * Create the minimap DOM element and its two canvases.
 * @param {HTMLElement} mountEl - The #mapMount element
 * @param {number} radius - Map radius (for initial sizing context)
 * @param {function} [getExploredFn] - (gameState) => Set<string> for click handler
 */
export function initMinimap(mountEl, radius, getExploredFn) {
  if (getExploredFn) _getExploredForClick = getExploredFn;
  if (minimapEl) {
    // Already initialized — reuse
    return;
  }

  // Create wrapper
  minimapEl = document.createElement('div');
  minimapEl.className = 'minimap-wrap';
  minimapEl.style.cssText = `
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: ${MINIMAP_SIZE}px;
    height: ${MINIMAP_SIZE}px;
    border: 1px solid rgba(120, 100, 80, 0.6);
    border-radius: 4px;
    overflow: hidden;
    background: #080602;
    z-index: 5;
    pointer-events: auto;
    cursor: crosshair;
  `;

  // Terrain canvas (background layer, re-rendered only on explored changes)
  terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = MINIMAP_SIZE;
  terrainCanvas.height = MINIMAP_SIZE;
  terrainCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  terrainCtx = terrainCanvas.getContext('2d');
  minimapEl.appendChild(terrainCanvas);

  // Overlay canvas (entities + camera indicator, re-rendered each frame)
  overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = MINIMAP_SIZE;
  overlayCanvas.height = MINIMAP_SIZE;
  overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  overlayCtx = overlayCanvas.getContext('2d');
  minimapEl.appendChild(overlayCanvas);

  // Click handler
  overlayCanvas.addEventListener('click', (e) => {
    const rect = overlayCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    handleMinimapClick(mx, my);
  });

  mountEl.appendChild(minimapEl);
}

// ---- Click handling ----

function handleMinimapClick(px, py) {
  if (cachedScale <= 0) return;

  // Invert the projection: pixel → world (x, z)
  const worldX = px / cachedScale + cachedOffsetX - PADDING / cachedScale;
  const worldZ = py / cachedScale + cachedOffsetZ - PADDING / cachedScale;

  // Find the closest explored hex to this world position
  const G = window.__gameState;
  if (!G) return;

  const explored = _getExploredForClick ? _getExploredForClick(G) : new Set();
  let bestKey = null;
  let bestDist = Infinity;

  for (const key of explored) {
    const p = parseKey(key);
    const { x, z } = hexCenter(p.q, p.r);
    const dx = worldX - x;
    const dz = worldZ - z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestKey = key;
    }
  }

  if (bestKey) {
    const p = parseKey(bestKey);
    const ctx3d = getSceneContext();
    if (ctx3d) {
      centerCameraOnHex(ctx3d.getCameraState(), p.q, p.r);
      ctx3d.applyCamera();
    }
  }
}

// ---- Terrain layer (cached) ----

function renderTerrainLayer(G, humanView) {
  const { explored } = humanView || { explored: new Set() };

  // Check if we need to redraw the terrain cache
  const fogRev = G._fogRevision || 0;
  if (fogRev === lastExploredRevision) return;

  lastExploredRevision = fogRev;

  const dpr = window.devicePixelRatio || 1;
  terrainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  terrainCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Get explored hex coordinates
  const exploredHexes = [];
  for (const key of explored) {
    exploredHexes.push(parseKey(key));
  }
  if (exploredHexes.length === 0) return;

  // Compute bounding box and scale
  const bounds = hexBounds(exploredHexes);
  const mapW = bounds.maxX - bounds.minX;
  const mapH = bounds.maxZ - bounds.minZ;
  const availW = MINIMAP_SIZE - PADDING * 2;
  const availH = MINIMAP_SIZE - PADDING * 2;

  const scaleX = mapW > 0 ? availW / mapW : 1;
  const scaleY = mapH > 0 ? availH / mapH : 1;
  cachedScale = Math.min(scaleX, scaleY);
  cachedOffsetX = bounds.minX;
  cachedOffsetZ = bounds.minZ;

  // Precompute scale corrected for hex aspect ratio
  // (flat-top hexes are sqrt(3) wide per 1.5 tall)
  const visibleSet = humanView ? humanView.visible : new Set();

  // Resolve palette
  const palette = G.biomePalette || {};

  // Draw each explored hex as a small colored dot
  const hexW = HEX_RADIUS * cachedScale;
  const hexH = HEX_RADIUS * 0.75 * cachedScale;

  for (const key of explored) {
    const tile = G.tiles[key];
    if (!tile) continue;

    const { x, z } = hexCenter(tile.q, tile.r);
    const px = (x - cachedOffsetX) * cachedScale + PADDING;
    const py = (z - cachedOffsetZ) * cachedScale + PADDING;

    const isVisible = visibleSet.has(key);
    const color = palette[tile.terrain] || TERRAIN_COLORS[tile.terrain] || [0.3, 0.3, 0.3];

    terrainCtx.globalAlpha = isVisible ? 1.0 : 0.3;
    terrainCtx.fillStyle = rgbToCSS(color);
    terrainCtx.beginPath();
    terrainCtx.ellipse(px, py, Math.max(hexW, 2), Math.max(hexH, 1.5), 0, 0, Math.PI * 2);
    terrainCtx.fill();
  }

  terrainCtx.globalAlpha = 1.0;
}

// ---- Terrain color lookup (mirrors TERRAIN_COLOR from terrainMesh.js) ----
const TERRAIN_COLORS = {
  plains:   [0.455, 0.678, 0.365],
  forest:   [0.294, 0.557, 0.255],
  desert:   [0.839, 0.694, 0.357],
  marsh:    [0.506, 0.600, 0.404],
  mountain: [0.529, 0.486, 0.416],
  water:    [0.373, 0.604, 0.757],
};

function rgbToCSS(rgb) {
  if (typeof rgb === 'string') return rgb;
  const [r, g, b] = rgb;
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

// ---- Overlay layer (entities + camera indicator, per frame) ----

function renderOverlayLayer(G, humanView) {
  const dpr = window.devicePixelRatio || 1;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlayCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  const visible = humanView ? humanView.visible : new Set();

  // Draw bases (visible only)
  for (const key of visible) {
    const tile = G.tiles[key];
    if (!tile || tile.feature?.kind !== 'base') continue;
    const p = parseKey(key);
    const { x, z } = hexCenter(p.q, p.r);
    const { px, py } = worldToMinimap(x, z);
    overlayCtx.fillStyle = factionColorCSS(tile.feature.faction);
    overlayCtx.fillRect(px - 3, py - 3, 6, 6);
  }

  // Draw champions (visible only)
  for (const champ of G.champions) {
    if (!champ.alive) continue;
    const key = coordKey(champ.pos);
    if (!visible.has(key)) continue;
    const { x, z } = hexCenter(champ.pos.q, champ.pos.r);
    const { px, py } = worldToMinimap(x, z);
    overlayCtx.fillStyle = factionColorCSS(champ.faction);
    overlayCtx.beginPath();
    overlayCtx.ellipse(px, py, 3, 3, 0, 0, Math.PI * 2);
    overlayCtx.fill();
  }

  // Draw mobs (visible only)
  if (G.mobs) {
    for (const mob of G.mobs) {
      if (!mob.alive) continue;
      const key = coordKey(mob.pos);
      if (!visible.has(key)) continue;
      const { x, z } = hexCenter(mob.pos.q, mob.pos.r);
      const { px, py } = worldToMinimap(x, z);
      overlayCtx.fillStyle = 'rgba(120, 100, 80, 0.8)';
      overlayCtx.beginPath();
      overlayCtx.ellipse(px, py, 2, 2, 0, 0, Math.PI * 2);
      overlayCtx.fill();
    }
  }

  // Draw traders (visible only)
  if (G.traders) {
    for (const trader of G.traders) {
      const key = coordKey(trader.pos);
      if (!visible.has(key)) continue;
      const { x, z } = hexCenter(trader.pos.q, trader.pos.r);
      const { px, py } = worldToMinimap(x, z);
      overlayCtx.fillStyle = 'rgba(74, 191, 154, 0.9)';
      overlayCtx.beginPath();
      overlayCtx.ellipse(px, py, 2, 2, 0, 0, Math.PI * 2);
      overlayCtx.fill();
    }
  }

  // Draw camera viewport indicator (rectangle showing what the 3D camera sees)
  drawCameraIndicator(G);
}

// ---- Faction color (mirrors FACTIONS) ----
function factionColorCSS(factionIndex) {
  const COLORS = [
    '#d4a017', // CRU
    '#7b3fa0', // REV
    '#c04040', // ALC
    '#2f6f4f', // ECG
    '#4a7aad', // ARC
    '#b8860b', // THL
    '#555555', // MUT
  ];
  return COLORS[factionIndex] || '#888';
}

// ---- Camera viewport indicator ----
function drawCameraIndicator(G) {
  const ctx3d = getSceneContext();
  if (!ctx3d) return;

  const camState = ctx3d.getCameraState();
  const { frustumSize, targetX, targetZ, aspect } = camState;

  // The orthographic camera sees a rectangle of size (frustumSize * aspect) x frustumSize
  // centered on (targetX, targetZ) in the ground plane.
  const halfW = (frustumSize * aspect) / 2;
  const halfH = frustumSize / 2;

  // Project the four corners of the camera frustum to minimap coords
  const corners = [
    { x: targetX - halfW, z: targetZ - halfH },
    { x: targetX + halfW, z: targetZ - halfH },
    { x: targetX + halfW, z: targetZ + halfH },
    { x: targetX - halfW, z: targetZ + halfH },
  ];

  overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  overlayCtx.lineWidth = 1;
  overlayCtx.beginPath();
  const first = worldToMinimap(corners[0].x, corners[0].z);
  overlayCtx.moveTo(first.px, first.py);
  for (let i = 1; i < corners.length; i++) {
    const { px, py } = worldToMinimap(corners[i].x, corners[i].z);
    overlayCtx.lineTo(px, py);
  }
  overlayCtx.closePath();
  overlayCtx.stroke();
}

// ---- Public API ----

/**
 * Render the minimap for the current game state.
 * Terrain layer is cached; overlay layer is always re-drawn.
 * @param {object} G - Game state
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView - Pre-computed fog-of-war view
 */
export function renderMinimap(G, humanView) {
  if (!minimapEl || !G) return;

  renderTerrainLayer(G, humanView);
  renderOverlayLayer(G, humanView);
}

/**
 * Clean up minimap resources (called on game restart).
 */
export function disposeMinimap() {
  if (minimapEl && minimapEl.parentNode) {
    minimapEl.parentNode.removeChild(minimapEl);
  }
  minimapEl = null;
  terrainCanvas = null;
  terrainCtx = null;
  overlayCanvas = null;
  overlayCtx = null;
  lastExploredRevision = -1;
}
