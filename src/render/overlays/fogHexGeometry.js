// src/render/overlays/fogHexGeometry.js
// Converts hex coordinates to world-space 3D corner arrays for fog mask generation.

import { tileTopY } from '../hexmap3d/hexMapRenderer.js';
import { hexCenter, hexCornersXZ } from '../hexmap3d/hexWorldSpace.js';

/**
 * Generate 6 world-space corners for a hex, lifted to mask height.
 * Mirrors the logic in fogMistLayer.js.
 */
export function getMaskCornersWorld(q, r, terrain) {
  const topY = tileTopY(terrain);
  const { x: cx, z: cz } = hexCenter(q, r);
  return hexCornersXZ(cx, cz).map(c => ({ x: c.x, y: topY, z: c.z }));
}
