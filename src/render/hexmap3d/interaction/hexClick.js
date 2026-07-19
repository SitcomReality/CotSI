import { pickHex } from './hexPicking.js';

/**
 * Create a click handler for hex selection.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {() => THREE.Mesh | null} getTerrainMesh
 * @param {(key: string) => void} onHexClick
 * @param {{ isPanning: boolean }} shared
 * @returns {(e: PointerEvent) => void}
 */
export function createClickHandler(canvas, getTerrainMesh, onHexClick, shared) {
  return function onClick(e) {
    if (shared.isPanning) return;
    if (!getTerrainMesh || !onHexClick) return;
    const terrain = getTerrainMesh();
    const camera = canvas.__camera;
    const key = terrain && camera ? pickHex(e.clientX, e.clientY, camera, terrain, canvas) : null;
    if (key !== null) {
      onHexClick(key);
    }
  };
}
