/**
 * minimapDom.js — DOM creation and lifecycle for the minimap.
 *
 * Owns the wrapper div, two canvases (terrain + overlay), and their 2D contexts.
 * Inline styles match the game's visual style.
 */

// ---- Constants ----
export const MINIMAP_SIZE = 200; // CSS pixels (square)
export const PADDING = 4;        // padding inside the minimap border

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
 * @param {function} onClick - Callback fired with (pixelX, pixelY) on click
 */
export function initMinimap(mountEl, onClick) {
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

  // Click handler
  _overlayCanvas.addEventListener('click', (e) => {
    const rect = _overlayCanvas.getBoundingClientRect();
    onClick(e.clientX - rect.left, e.clientY - rect.top);
  });

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
