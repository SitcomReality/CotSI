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
import { getSceneContext } from '../hexmap3d/hexMapRenderer.js';
import { getClock } from '../../shared/clockScheduler.js';

// ---- Module-level shared state ----
let _getExploredForClick = null;
let _cachedScale = 0;
let _cachedOffsetX = 0;
let _cachedOffsetZ = 0;
let _overlayTickStop = null;
let _lastG = null;
let _lastHumanView = null;
let _lastOverlayFingerprint = null;

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
      handleMinimapClick(_lastG, mx, my, _cachedScale, _cachedOffsetX, _cachedOffsetZ, _getExploredForClick);
    }
  });

  // Register per-frame overlay redraw so the camera indicator follows
  // interactive pan/zoom without needing a full game-state refresh.
  // Dirty-checked: skips the redraw when the camera and entities are unchanged.
  _overlayTickStop = getClock().onTick(() => {
    if (_lastG && _lastHumanView && _cachedScale > 0) {
      const fingerprint = overlayFingerprint(_lastG, _cachedScale, _cachedOffsetX, _cachedOffsetZ);
      if (fingerprint !== _lastOverlayFingerprint) {
        _lastOverlayFingerprint = fingerprint;
        renderOverlayLayer(_lastG, _lastHumanView, _cachedScale, _cachedOffsetX, _cachedOffsetZ);
      }
    }
  });
}

/**
 * Cheap signature of everything the overlay draws: camera state, projection
 * params, and alive entity positions. When it is unchanged, the redraw would
 * produce a pixel-identical frame, so it is skipped.
 */
function overlayFingerprint(G, scale, offsetX, offsetZ) {
  let cam = '';
  const ctx3d = getSceneContext();
  if (ctx3d) {
    const c = ctx3d.getCameraState();
    cam = `${c.frustumSize}|${c.targetX.toFixed(3)}|${c.targetZ.toFixed(3)}|${c.aspect.toFixed(4)}|${c.pitch.toFixed(4)}|${c.yaw.toFixed(4)}`;
  }
  let ents = '';
  for (const champ of G.champions) {
    if (champ.alive) ents += `c${champ.id}:${champ.pos.q},${champ.pos.r};`;
  }
  if (G.mobs) {
    for (const mob of G.mobs) {
      if (mob.alive) ents += `m${mob.id}:${mob.pos.q},${mob.pos.r};`;
    }
  }
  if (G.traders) {
    for (const trader of G.traders) {
      ents += `t${trader.id}:${trader.pos.q},${trader.pos.r};`;
    }
  }
  return `${scale}|${offsetX.toFixed(2)}|${offsetZ.toFixed(2)}|${cam}|${ents}`;
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
  _lastOverlayFingerprint = null; // force one fresh overlay redraw on the next tick
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
  _lastOverlayFingerprint = null;
}
