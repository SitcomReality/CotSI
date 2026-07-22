// src/render/overlays/fogHexGeometry.js
// Converts hex coordinates to world-space 3D corner arrays for fog mask generation.
//
// The fog mask must cover the full visible extent of each hex tile — both top
// and bottom surfaces — because the pitched orthographic camera projects
// different heights to different screen positions. Using only the top surface
// leaves a dark fringe ("shadow") at the base of elevated tiles.

import { tileTopY, HEX_THICKNESS } from '../hexmap3d/hexMapRenderer.js';
import { hexCenter, hexCornersXZ } from '../hexmap3d/hexWorldSpace.js';

/**
 * Generate 12 world-space corners for a hex: 6 at the top surface and 6 at the
 * bottom surface. Both are needed so the fog-mask hole covers the full visible
 * height of the hex body, preventing dark fringes on elevated tiles.
 *
 * @param {number} q
 * @param {number} r
 * @param {string} terrain
 * @returns {{ top: Array<{x,y,z}>, bottom: Array<{x,y,z}> }}
 */
export function getHexCornersWorld(q, r, terrain) {
  const topY = tileTopY(terrain);
  const bottomY = topY - HEX_THICKNESS;
  const { x: cx, z: cz } = hexCenter(q, r);
  const baseCorners = hexCornersXZ(cx, cz);
  return {
    top: baseCorners.map(c => ({ x: c.x, y: topY, z: c.z })),
    bottom: baseCorners.map(c => ({ x: c.x, y: bottomY, z: c.z })),
  };
}

/**
 * Legacy wrapper returning only top-surface corners.
 * @deprecated Use getHexCornersWorld instead.
 */
export function getMaskCornersWorld(q, r, terrain) {
  return getHexCornersWorld(q, r, terrain).top;
}
