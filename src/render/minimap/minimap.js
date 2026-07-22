/**
 * minimap.js — Public API for the 2D minimap overlay.
 *
 * Orchestrates the four sub-modules: DOM lifecycle, terrain layer, overlay layer,
 * and click handling. Exports the same public API as before.
 */

import { initMinimap as domInit, disposeMinimap as domDispose } from './minimapDom.js';
import { renderTerrainLayer, resetTerrainCache } from './minimapTerrainLayer.js';
import { renderOverlayLayer } from './minimapOverlayLayer.js';
import { handleMinimapClick } from './minimapClickHandler.js';
import { getClock } from '../../shared/clockScheduler.js';

// ---- Module-level shared state ----
let _getExploredForClick = null;
let _cachedScale = 0;
let _cachedOffsetX = 0;
let _cachedOffsetZ = 0;
let _overlayTickStop = null;
let _lastG = null;
let _lastHumanView = null;

// ---- Initialization ----

/**
 * Create the minimap DOM element and its two canvases.
 * @param {HTMLElement} mountEl - The #mapMount element
 * @param {number} radius - Map radius (for initial sizing context)
 * @param {function} [getExploredFn] - (gameState) => Set<string> for click handler
 */
export function initMinimap(mountEl, radius, getExploredFn) {
  if (getExploredFn) _getExploredForClick = getExploredFn;
  domInit(mountEl, (mx, my) => {
    if (_cachedScale > 0) {
      handleMinimapClick(mx, my, _cachedScale, _cachedOffsetX, _cachedOffsetZ, _getExploredForClick);
    }
  });

  // Register per-frame overlay redraw so the camera indicator follows
  // interactive pan/zoom without needing a full game-state refresh.
  _overlayTickStop = getClock().onTick(() => {
    if (_lastG && _lastHumanView && _cachedScale > 0) {
      renderOverlayLayer(_lastG, _lastHumanView, _cachedScale, _cachedOffsetX, _cachedOffsetZ);
    }
  });
}

// ---- Public API ----

/**
 * Render the minimap for the current game state.
 * Terrain layer is cached; overlay layer is always re-drawn.
 * @param {object} G - Game state
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView - Pre-computed fog-of-war view
 */
export function renderMinimap(G, humanView) {
  _lastG = G;
  _lastHumanView = humanView;
  const result = renderTerrainLayer(G, humanView);
  if (result) {
    _cachedScale = result.scale;
    _cachedOffsetX = result.offsetX;
    _cachedOffsetZ = result.offsetZ;
  }
  renderOverlayLayer(G, humanView, _cachedScale, _cachedOffsetX, _cachedOffsetZ);
}

/**
 * Clean up minimap resources (called on game restart).
 */
export function disposeMinimap() {
  if (_overlayTickStop) {
    _overlayTickStop();
    _overlayTickStop = null;
  }
  domDispose();
  resetTerrainCache();
  _getExploredForClick = null;
  _cachedScale = 0;
  _cachedOffsetX = 0;
  _cachedOffsetZ = 0;
  _lastG = null;
  _lastHumanView = null;
}
