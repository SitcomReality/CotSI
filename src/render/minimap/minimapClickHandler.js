/**
 * minimapClickHandler.js — Click-to-navigate logic for the minimap.
 *
 * Inverts the minimap pixel projection to recover world coordinates, then finds
 * the nearest explored hex and centers the 3D camera on it.
 *
 * NOTE: The pixel-to-world inversion here assumes an axis-aligned projection.
 * If the minimap terrain/overlay layers are changed to apply a rotation
 * (CAMERA_YAW = Math.PI / 6 in cameraState.js), this handler must apply the
 * inverse rotation (-CAMERA_YAW) to the recovered world coordinates before
 * searching for the nearest hex.
 *
 * @see src/render/hexmap3d/scene/cameraState.js CAMERA_YAW
 */

import { parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { centerCameraOnHex, getSceneContext } from '../hexmap3d/hexMapRenderer.js';
import { PADDING } from './minimapDom.js';

/**
 * Handle a click on the minimap overlay canvas.
 *
 * @param {number} px - Pixel X relative to the overlay canvas
 * @param {number} py - Pixel Y relative to the overlay canvas
 * @param {number} scale - Current minimap scale
 * @param {number} offsetX - Current world X offset
 * @param {number} offsetZ - Current world Z offset
 * @param {function} getExploredFn - (gameState) => {{ visible: Set<string>, explored: Set<string> }}
 */
export function handleMinimapClick(px, py, scale, offsetX, offsetZ, getExploredFn) {
  if (scale <= 0) return;

  // Invert the projection: pixel → world (x, z)
  const worldX = px / scale + offsetX - PADDING / scale;
  const worldZ = py / scale + offsetZ - PADDING / scale;

  // Find the closest explored hex to this world position
  const G = window.__gameState;
  if (!G) return;

  const humanView = getExploredFn ? getExploredFn(G) : { explored: new Set() };
  const explored = humanView.explored;
  let bestKey = null;
  let bestDist = Infinity;

  for (const key of explored) {
    const p = parseKey(key);
    const { x, z } = hexCenter(p.q, p.r);
    const dx = worldX - x;
    const dz = worldZ - z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestKey = key;
    }
  }

  if (bestKey) {
    const p = parseKey(bestKey);
    const ctx3d = getSceneContext();
    if (ctx3d) {
      centerCameraOnHex(ctx3d.getCameraState(), p.q, p.r);
      ctx3d.applyCamera();
    }
  }
}
