import { pickHex } from './hexPicking.js';
import { showTooltip, hideTooltip } from './hoverTooltip.js';
import { setHoveredHexKey } from '../../overlays/movementHighlights.js';

/**
 * Create a pointer-move handler that shows/hides a hex tooltip.
 *
 * Tooltip content is rebuilt only when the hex key changes (avoids
 * recomputing movementRange BFS every frame). Position is updated on
 * every pointermove for smooth cursor-following.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {() => THREE.Mesh | null} getTerrainMesh
 * @param {(key: string) => Node | null} getTooltipContent
 * @param {{ isPanning: boolean }} shared
 * @returns {(e: PointerEvent) => void}
 */
export function createHoverHandler(canvas, getTerrainMesh, getTooltipContent, shared) {
  let hoveredKey = null;
  let cachedNode = null;

  return function onPointerMove(e) {
    if (shared.isPanning) {
      hideTooltip();
      hoveredKey = null;
      cachedNode = null;
      return;
    }

    if (!getTerrainMesh || !getTooltipContent) return;

    const terrain = getTerrainMesh();
    const camera = canvas.__camera;
    const key = terrain && camera ? pickHex(e.clientX, e.clientY, camera, terrain, canvas) : null;

    if (key !== hoveredKey) {
      // Hex changed: rebuild tooltip content
      hoveredKey = key;
      setHoveredHexKey(key);   // notify movement highlights layer
      cachedNode = null;
      if (key !== null) {
        cachedNode = getTooltipContent(key);
      }
    }

    // Show/hide and position based on current state
    if (hoveredKey !== null && cachedNode) {
      showTooltip(e.clientX, e.clientY, cachedNode);
    } else {
      hideTooltip();
    }
  };
}