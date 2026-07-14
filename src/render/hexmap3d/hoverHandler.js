import { pickHex } from './picking.js';
import { showTooltip, hideTooltip } from './tooltip.js';

/**
 * Create a pointer-move handler that shows/hides a hex tooltip.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {() => THREE.Mesh | null} getTerrainMesh
 * @param {(key: string) => string | null} getTooltipContent
 * @param {{ isPanning: boolean }} shared
 * @returns {(e: PointerEvent) => void}
 */
export function createHoverHandler(canvas, getTerrainMesh, getTooltipContent, shared) {
  let hoveredKey = null;

  return function onPointerMove(e) {
    if (shared.isPanning) {
      hideTooltip();
      hoveredKey = null;
      return;
    }

    if (!getTerrainMesh || !getTooltipContent) return;

    const terrain = getTerrainMesh();
    const camera = canvas.__camera;
    const key = terrain && camera ? pickHex(e.clientX, e.clientY, camera, terrain, canvas) : null;

    if (key !== hoveredKey) {
      hoveredKey = key;
      if (key !== null) {
        const html = getTooltipContent(key);
        if (html) {
          showTooltip(e.clientX, e.clientY, html);
        } else {
          hideTooltip();
        }
      } else {
        hideTooltip();
      }
    } else if (key !== null && hoveredKey === key) {
      const html = getTooltipContent(key);
      if (html) showTooltip(e.clientX, e.clientY, html);
    }
  };
}