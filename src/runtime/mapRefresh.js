/**
 * mapRefresh — 3D map initialization and per-refresh rendering.
 *
 * Owns the singleton `map3dInitialized` and `lastCenteredChampionId` flags.
 * Imports live bindings (G, currentChamp) at runtime like its callers.
 */
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext, centerCameraOnHex, fitCameraToMap } from '../render/hexmap3d/hexMapRenderer.js';
import { onHexClick } from './hexBridge.js';
import { getTooltipContent } from '../ui/mapTooltip.js';
import { G, currentChamp } from '../game/state/liveGame.js';
import { initMinimap, renderMinimap, disposeMinimap } from '../render/minimap/minimap.js';
import { startMeasure, endMeasure } from '../dev/devPerformance.js';

/** Whether the 3D scene has been initialized once. */
let map3dInitialized = false;

/** Whether the minimap has been initialized. */
let minimapInitialized = false;

/** Track which champion we last centered the camera on (by id). */
let lastCenteredChampionId = null;

/**
 * Initialize the 3D map scene (once) then render the current state.
 * Centers the camera on the human champion's position at turn start.
 */
export function refreshMap() {
  startMeasure('mapRefresh');

  if (!G) {
    console.warn('[refreshMap] G is null — bail');
    endMeasure('mapRefresh');
    return;
  }

  const mountEl = document.getElementById('mapMount');
  if (!mountEl) {
    console.warn('[refreshMap] #mapMount not found in DOM');
    endMeasure('mapRefresh');
    return;
  }

  const rect = mountEl.getBoundingClientRect();

  if (!map3dInitialized) {
    // First call: clear mount, init 3D scene
    mountEl.replaceChildren();
    try {
      const ctx = initHexMap3D(mountEl);

      // Auto-fit camera to map size so the full map is visible at start
      if (G.radius) {
        fitCameraToMap(ctx.getCameraState(), G.radius);
        ctx.applyCamera();
      }
    } catch (err) {
      console.error('[refreshMap] initHexMap3D threw:', err);
    }
    setupMapInteraction3D(
      onHexClick,
      (key) => getTooltipContent(G, key, currentChamp())
    );
    map3dInitialized = true;
  }

  try {
    renderHexMap3D(G);
  } catch (err) {
    console.error('[refreshMap] renderHexMap3D threw:', err);
  }

  // Initialize minimap on first render after game state is ready
  if (!minimapInitialized) {
    initMinimap(mountEl, G.radius);
    minimapInitialized = true;
  }

  // Render minimap each refresh (caches internally)
  renderMinimap(G);

  // Center camera on human champion at turn start (only when champion changes)
  const ch = currentChamp();
  if (ch && ch.controller === 'human' && ch.id !== lastCenteredChampionId) {
    const ctx3d = getSceneContext();
    if (ctx3d) {
      centerCameraOnHex(ctx3d.getCameraState(), ch.pos.q, ch.pos.r);
      ctx3d.applyCamera();
    }
    lastCenteredChampionId = ch.id;
  }

  endMeasure('mapRefresh');
}

/**
 * Reset the initialization flag (used when disposing the scene for a new game).
 */
export function resetMapInitialized() {
  map3dInitialized = false;
  minimapInitialized = false;
  lastCenteredChampionId = null;
  disposeMinimap();
}
