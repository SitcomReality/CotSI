/**
 * initMap3d — One-time 3D scene initialization for the hex map.
 *
 * Owns the singleton `map3dInitialized` flag.
 * Per-refresh rendering lives in mapRefresh.js; shared camera-focus in mapCamera.js.
 */
import { initHexMap3D, setupMapInteraction3D, fitCameraToMap } from '../render/hexmap3d/hexMapRenderer.js';
import { onHexClick } from './hexBridge.js';
import { getTooltipContent } from '../ui/mapTooltip.js';
import { refreshZoomDisplay } from './zoomDisplay.js';
import { G, currentChamp } from '../game/state/liveGame.js';
import { focusCameraOnHex, setLastCenteredChampionId } from './mapCamera.js';

/** Whether the 3D scene has been initialized once. */
let map3dInitialized = false;

/**
 * Initialize the 3D map scene (one-time only). Subsequent calls are no-ops.
 * @param {Element} mountEl - The DOM mount element for the 3D canvas
 * @param {Object} gameState - The game state object G
 * @returns {boolean} true if initialization ran, false if already initialized
 */
export function initMap3D(mountEl, gameState) {
  if (map3dInitialized) return false;

  mountEl.replaceChildren();
  try {
    const ctx = initHexMap3D(mountEl);

    // Auto-fit camera to map size so the full map is visible at start
    if (gameState.radius) {
      fitCameraToMap(ctx.getCameraState(), gameState.radius);
      ctx.applyCamera();
    }

    // At game start, center on the first human champion at a close-up
    // zoom (~1200%) so players get an intimate view of their surroundings.
    const humansInOrder = gameState.currentOrder
      .map(id => gameState.champions.find(c => c.id === id))
      .filter(c => c && c.controller === 'human' && c.alive);
    if (humansInOrder.length > 0) {
      const firstHuman = humansInOrder[0];
      focusCameraOnHex(firstHuman.pos.q, firstHuman.pos.r);
      setLastCenteredChampionId(firstHuman.id);
    }
  } catch (err) {
    console.error('[initMap3D] initHexMap3D threw:', err);
  }
  setupMapInteraction3D(
    onHexClick,
    (key) => getTooltipContent(G, key, currentChamp()),
    refreshZoomDisplay
  );
  map3dInitialized = true;
  refreshZoomDisplay();
  return true;
}

/**
 * Reset the initialization flag (used when disposing the scene for a new game).
 */
export function resetInitFlags() {
  map3dInitialized = false;
}
