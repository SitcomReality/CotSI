/**
 * minimapDom.js — DOM creation and lifecycle for the minimap.
 *
 * Owns the wrapper div, two canvases (terrain + overlay), and their 2D contexts.
 * Inline styles match the game's visual style. The minimap is display-only:
 * pointer events pass through to the scene below.
 */

// ---- Constants ----
import { MINIMAP_SIZE, MINIMAP_PADDING, MINIMAP_MARGIN_PX } from '../../params/render/minimapParams.js';
export { MINIMAP_SIZE };
export const PADDING = MINIMAP_PADDING;

// ---- Module-level state ----
let minimapEl = null;
let _terrainCanvas = null;
let _terrainCtx = null;
let _overlayCanvas = null;
let _overlayCtx = null;

export function getTerrainCtx() { return _terrainCtx; }
export function getOverlayCtx() { return _overlayCtx; }

/**
 * Create the minimap DOM element and its two canvases.
 * @param {HTMLElement} mountEl - The #mapMount element
 */
export function initMinimap(mountEl) {
  if (minimapEl) {
    // Already initialized — reuse
    return;
  }

  // Create wrapper
  minimapEl = document.createElement('div');
  minimapEl.className = 'minimap-wrap';
  // Geometry stays inline (params-driven); the LOOK (border, radius,
  // background, glow, sheen) lives in styles/components/minimap.css so the
  // theme can retint it without JS changes.
  minimapEl.style.cssText = `
    position: absolute;
    bottom: ${MINIMAP_MARGIN_PX}px;
    right: ${MINIMAP_MARGIN_PX}px;
    width: ${MINIMAP_SIZE}px;
    height: ${MINIMAP_SIZE}px;
    z-index: 5;
    pointer-events: none;
  `;

  // Terrain canvas (background layer, re-rendered only on explored changes)
  _terrainCanvas = document.createElement('canvas');
  _terrainCanvas.width = MINIMAP_SIZE;
  _terrainCanvas.height = MINIMAP_SIZE;
  _terrainCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  _terrainCtx = _terrainCanvas.getContext('2d');
  minimapEl.appendChild(_terrainCanvas);

  // Overlay canvas (entities + camera indicator, re-rendered each frame)
  _overlayCanvas = document.createElement('canvas');
  _overlayCanvas.width = MINIMAP_SIZE;
  _overlayCanvas.height = MINIMAP_SIZE;
  _overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  _overlayCtx = _overlayCanvas.getContext('2d');
  minimapEl.appendChild(_overlayCanvas);

  mountEl.appendChild(minimapEl);
}

/**
 * Clean up minimap resources (called on game restart).
 */
export function disposeMinimap() {
  if (minimapEl && minimapEl.parentNode) {
    minimapEl.parentNode.removeChild(minimapEl);
  }
  minimapEl = null;
  _terrainCanvas = null;
  _terrainCtx = null;
  _overlayCanvas = null;
  _overlayCtx = null;
}
