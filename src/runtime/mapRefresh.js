/**
 * mapRefresh — 3D map initialization and per-refresh rendering.
 *
 * Owns the singleton `map3dInitialized` and `lastCenteredChampionId` flags.
 * Imports live bindings (G, currentChamp) at runtime like its callers.
 */
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext, animateCenterOnHex, centerOnHexWithFixedZoom, fitCameraToMap } from '../render/hexmap3d/hexMapRenderer.js';
import { onHexClick } from './hexBridge.js';
import { getTooltipContent, refreshZoomDisplay } from '../ui/mapTooltip.js';
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

      // At game start, center on the first human champion at a close-up
      // zoom (~400%) so players aren't looking at the full map overview.
      const humansInOrder = G.currentOrder
        .map(id => G.champions.find(c => c.id === id))
        .filter(c => c && c.controller === 'human' && c.alive);
      if (humansInOrder.length > 0) {
        const firstHuman = humansInOrder[0];
        const state = ctx.getCameraState();
        // Set zoom immediately, then animate the pan smoothly
        const panFromX = state.targetX, panFromZ = state.targetZ;
        centerOnHexWithFixedZoom(state, firstHuman.pos.q, firstHuman.pos.r, 400);
        state.targetX = panFromX;
        state.targetZ = panFromZ;
        animateCenterOnHex(state, ctx.applyCamera, firstHuman.pos.q, firstHuman.pos.r);
        lastCenteredChampionId = firstHuman.id;
      }
    } catch (err) {
      console.error('[refreshMap] initHexMap3D threw:', err);
    }
    setupMapInteraction3D(
      onHexClick,
      (key) => getTooltipContent(G, key, currentChamp())
    );
    map3dInitialized = true;
    // Show the real zoom level after init instead of the hardcoded "100%"
    refreshZoomDisplay();
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

  // Center camera on human champion at turn start (only when champion changes).
  // Zooms to a fixed ~400% zoom for a tight context-rich view.
  const ch = currentChamp();
  if (ch && ch.controller === 'human' && ch.id !== lastCenteredChampionId) {
    const ctx3d = getSceneContext();
    if (ctx3d) {
      const state = ctx3d.getCameraState();
      // Set zoom immediately, then animate the pan smoothly
      const panFromX = state.targetX, panFromZ = state.targetZ;
      centerOnHexWithFixedZoom(state, ch.pos.q, ch.pos.r, 400);
      state.targetX = panFromX;
      state.targetZ = panFromZ;
      animateCenterOnHex(state, ctx3d.applyCamera, ch.pos.q, ch.pos.r);
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
