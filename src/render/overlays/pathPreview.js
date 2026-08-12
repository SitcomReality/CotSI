// 2D overlay layer: proposed movement route (hover preview or click-to-
// preview mode). Priority 6 (between movement highlights at 5 and interaction
// highlights at 7).
//
// Draws a polyline through the path hex centers plus an outline stroke on
// each path hex, in the same verdigris family as movement highlights so the
// route reads as "the path you would walk".

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileSurfaceY } from '../hexmap3d/hexMapRenderer.js';
import { getPathPreview } from './overlayStack.js';
import { parseKey } from '../../engine/rules/hexGrid.js';
import {
  HIGHLIGHT_RADIUS_FRAC,
  HIGHLIGHT_Y_OFFSET,
  PATH_PREVIEW_WIDTH,
  PATH_PREVIEW_LINE_WIDTH,
  PATH_PREVIEW_COLOR,
} from '../../params/render/overlayParams.js';

export function renderPathPreview(ctx2d, state, camera, time) {
  const preview = getPathPreview();
  if (!preview || !preview.keys || !preview.keys.length) return;

  const canvas = ctx2d.canvas;

  // Project every path hex; skip the route if any hex is behind the camera.
  const centers = [];
  const cornersByKey = new Map();
  for (const key of preview.keys) {
    const tile = state.tiles[key];
    if (!tile) return;
    const surfaceY = tileSurfaceY(tile);
    const hc = hexCenter3D(tile.q, tile.r, surfaceY);
    const center = worldToScreen(hc.x, surfaceY + HIGHLIGHT_Y_OFFSET, hc.z, camera, canvas);
    if (!center) return;
    const corners3d = hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS_FRAC);
    const corners = [];
    for (const c of corners3d) {
      const s = worldToScreen(c.x, surfaceY + HIGHLIGHT_Y_OFFSET, c.z, camera, canvas);
      if (!s) return;
      corners.push(s);
    }
    centers.push({ x: center.x, y: center.y, key });
    cornersByKey.set(key, corners);
  }

  // Soft fill + outline per path hex
  for (const key of preview.keys) {
    const corners = cornersByKey.get(key);
    ctx2d.beginPath();
    ctx2d.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) ctx2d.lineTo(corners[i].x, corners[i].y);
    ctx2d.closePath();
    ctx2d.fillStyle = 'rgba(122, 255, 212, 0.10)';
    ctx2d.fill();
    ctx2d.strokeStyle = PATH_PREVIEW_COLOR;
    ctx2d.lineWidth = PATH_PREVIEW_WIDTH;
    ctx2d.stroke();
  }

  // Route polyline through hex centers (start hex is implied by the champ).
  if (centers.length > 1) {
    ctx2d.beginPath();
    ctx2d.moveTo(centers[0].x, centers[0].y);
    for (let i = 1; i < centers.length; i++) ctx2d.lineTo(centers[i].x, centers[i].y);
    ctx2d.strokeStyle = PATH_PREVIEW_COLOR;
    ctx2d.lineWidth = PATH_PREVIEW_LINE_WIDTH;
    ctx2d.lineCap = 'round';
    ctx2d.stroke();
    ctx2d.lineCap = 'butt';
  }
}
