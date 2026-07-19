/**
 * mapRefresh — 3D map initialization and per-refresh rendering.
 *
 * Owns the singleton `map3dInitialized` and `lastCenteredChampionId` flags.
 * Imports live bindings (G, currentChamp) at runtime like its callers.
 */
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext, centerCameraOnHex } from '../render/hexmap3d/hexMapRenderer.js';
import { onHexClick } from './hexBridge.js';
import { getTooltipContent } from '../ui/mapTooltip.js';
import { G, currentChamp } from '../game/state/liveGame.js';

/** Whether the 3D scene has been initialized once. */
let map3dInitialized = false;

/** Track which champion we last centered the camera on (by id). */
let lastCenteredChampionId = null;

/**
 * Initialize the 3D map scene (once) then render the current state.
 * Centers the camera on the human champion's position at turn start.
 */
export function refreshMap() {
  if (!G) return;

  const mountEl = document.getElementById('mapMount');
  if (!mountEl) return;

  if (!map3dInitialized) {
    // First call: clear mount, init 3D scene
    mountEl.replaceChildren();
    initHexMap3D(mountEl);
    setupMapInteraction3D(
      onHexClick,
      (key) => getTooltipContent(G, key, currentChamp())
    );
    map3dInitialized = true;
  }

  renderHexMap3D(G);

  // Center camera on human champion at turn start
  const ch = currentChamp();
  if (ch && ch.controller === 'human' && ch.id !== lastCenteredChampionId) {
    const ctx3d = getSceneContext();
    if (ctx3d) {
      centerCameraOnHex(ctx3d.getCameraState(), ch.pos.q, ch.pos.r);
      ctx3d.applyCamera();
    }
    lastCenteredChampionId = ch.id;
  }
}

/**
 * Reset the initialization flag (used when disposing the scene for a new game).
 */
export function resetMapInitialized() {
  map3dInitialized = false;
  lastCenteredChampionId = null;
}