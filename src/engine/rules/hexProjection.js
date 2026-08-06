/**
 * hexProjection.js — Hex-coordinate projection math for the minimap.
 *
 * Pure, DOM-free, and node-importable. The minimap rotates world-space hex
 * centers by CAMERA_YAW (π/6) so its orientation matches the 3D view; this
 * module owns that rotation plus the viewport-fit scale/window math shared by
 * the minimap layers and the fog-of-war explored-bounds tracker.
 *
 * Hex geometry matches hexWorldSpace.js: pointy-top layout with HEX_RADIUS =
 * 1.0, so center-to-center spacing is √3 world units. The "maximum zoom out"
 * floors the scale at MINIMAP_MIN_HEX_PX per hex; when the explored map can't
 * fit at that floor, the minimap shows a champion-centered window the size of
 * the canvas instead of shrinking the whole map.
 */

import { CAMERA_YAW } from '../../params/render/cameraParams.js';
import { MINIMAP_SIZE, MINIMAP_PADDING, MINIMAP_MIN_HEX_PX } from '../../params/render/minimapParams.js';
import { cubeRound } from './hexGrid.js';

/** World-space hex radius — matches src/render/hexmap3d/hexWorldSpace.js. */
export const HEX_RADIUS = 1.0;
/** Center-to-center spacing of adjacent pointy-top hexes (world units). */
export const HEX_SPACING = Math.sqrt(3) * HEX_RADIUS;

/** Hard floor for the minimap scale, in px per world unit. */
export const MIN_SCALE = MINIMAP_MIN_HEX_PX / HEX_SPACING;

const COS_YAW = Math.cos(CAMERA_YAW);
const SIN_YAW = Math.sin(CAMERA_YAW);

/**
 * Rotate a hex's world-space center by CAMERA_YAW (CCW), matching the minimap
 * projection.
 * @param {number} q - Axial q
 * @param {number} r - Axial r
 * @returns {{ x: number, z: number }} Rotated-space point
 */
export function rotatedPoint(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return {
    x: x * COS_YAW - z * SIN_YAW,
    z: x * SIN_YAW + z * COS_YAW,
  };
}

/**
 * Compute the minimap projection parameters for the current explored map.
 *
 * Fit mode: the whole explored map (bounds + hex radius padding) fits at
 * >= MINIMAP_MIN_HEX_PX per hex, so it is scaled to fill the canvas and
 * centered on the map.
 *
 * Windowed mode: the map is too large to fit at the floor, so the scale stays
 * pinned at the floor and the window is centered on the champion's hex.
 *
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number } | null} exploredBounds
 *   Exact rotated-space bounds of the explored hexes, or null if nothing is
 *   explored yet.
 * @param {{ x: number, z: number } | null} championPoint - Rotated-space
 *   position of the window anchor (the human champion the camera follows).
 * @param {number} [sizePx] - Canvas size in px (square).
 * @param {number} [paddingPx] - Canvas padding in px.
 * @returns {{ scale: number, offsetX: number, offsetZ: number, windowed: boolean, availPx: number }}
 *   scale is px per world unit; offsets are the rotated-space world coords that
 *   project to the padded canvas origin. `windowed` is true when the scale hit
 *   the floor (champion-centered window instead of whole map).
 */
export function computeMinimapProjection(exploredBounds, championPoint, sizePx = MINIMAP_SIZE, paddingPx = MINIMAP_PADDING) {
  const availPx = sizePx - paddingPx * 2;

  if (exploredBounds) {
    const w = exploredBounds.maxX - exploredBounds.minX + HEX_RADIUS * 2;
    const h = exploredBounds.maxZ - exploredBounds.minZ + HEX_RADIUS * 2;
    const fitScale = w > 0 && h > 0 ? Math.min(availPx / w, availPx / h) : Infinity;
    if (fitScale >= MIN_SCALE) {
      // Whole explored map fits at >= 1px per hex — fit it, centered on the map.
      return {
        scale: fitScale,
        offsetX: exploredBounds.minX - HEX_RADIUS,
        offsetZ: exploredBounds.minZ - HEX_RADIUS,
        windowed: false,
        availPx,
      };
    }
  }

  // Windowed: pinned at the floor, centered on the anchor (champion), or the
  // world origin when there is no champion yet.
  const cx = championPoint ? championPoint.x : 0;
  const cz = championPoint ? championPoint.z : 0;
  return {
    scale: MIN_SCALE,
    offsetX: cx - availPx / (2 * MIN_SCALE),
    offsetZ: cz - availPx / (2 * MIN_SCALE),
    windowed: true,
    availPx,
  };
}

/**
 * Invert a minimap pixel to the hex containing it, via inverse rotation and
 * cube rounding. The inverse of projecting a hex center through
 * (offset, scale, padding).
 *
 * @param {number} px - Pixel X (CSS px)
 * @param {number} py - Pixel Y (CSS px)
 * @param {{ scale: number, offsetX: number, offsetZ: number }} proj - Projection
 *   from computeMinimapProjection.
 * @param {number} [sizePx] - Canvas size in px (square).
 * @param {number} [paddingPx] - Canvas padding in px.
 * @returns {{ q: number, r: number }} Nearest hex to the pixel
 */
export function pixelToHex(px, py, proj, sizePx = MINIMAP_SIZE, paddingPx = MINIMAP_PADDING) {
  const xr = (px - paddingPx) / proj.scale + proj.offsetX;
  const zr = (py - paddingPx) / proj.scale + proj.offsetZ;
  // Inverse of the CAMERA_YAW rotation.
  const wx = xr * COS_YAW + zr * SIN_YAW;
  const wz = -xr * SIN_YAW + zr * COS_YAW;
  // Inverse of the pointy-top hex center formulas.
  const rf = wz / (1.5 * HEX_RADIUS);
  const qf = wx / (Math.sqrt(3) * HEX_RADIUS) - rf / 2;
  return cubeRound(qf, rf);
}
