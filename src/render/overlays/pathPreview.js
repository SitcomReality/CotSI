// 2D overlay layer: the click-to-preview route (dev/docs/movementAndOccupation.md §5).
// Priority 6 (between movement highlights at 5 and interaction highlights at 7).
//
// Drawn ONLY after a click-to-preview (never on hover) and it persists until
// the preview is cancelled or committed. The route line starts at the hex the
// champion stands on, runs through each path hex, and ends with a distinct
// white destination terminal (outline + center dot) so the target reads
// clearly.

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileSurfaceY } from '../hexmap3d/hexMapRenderer.js';
import { getPathPreview } from './overlayStack.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import {
  HIGHLIGHT_RADIUS_FRAC,
  HIGHLIGHT_Y_OFFSET,
  PATH_PREVIEW_WIDTH,
  PATH_PREVIEW_LINE_WIDTH,
  PATH_PREVIEW_COLOR,
  PATH_DEST_COLOR,
  PATH_DEST_WIDTH,
  PATH_DEST_DOT_FRAC,
} from '../../params/render/overlayParams.js';

/** Project one hex, returning { center, corners } screen points or null. */
function projectHex(tile, camera, canvas) {
  const surfaceY = tileSurfaceY(tile);
  const hc = hexCenter3D(tile.q, tile.r, surfaceY);
  const center = worldToScreen(hc.x, surfaceY + HIGHLIGHT_Y_OFFSET, hc.z, camera, canvas);
  if (!center) return null;
  const corners = [];
  for (const c of hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS_FRAC)) {
    const s = worldToScreen(c.x, surfaceY + HIGHLIGHT_Y_OFFSET, c.z, camera, canvas);
    if (!s) return null;
    corners.push(s);
  }
  return { center, corners };
}

/** Trace a hex outline onto the current path. */
function traceHex(ctx2d, corners) {
  ctx2d.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx2d.lineTo(corners[i].x, corners[i].y);
  ctx2d.closePath();
}

export function renderPathPreview(ctx2d, state, camera, time) {
  const preview = getPathPreview();
  if (!preview || !preview.keys || !preview.keys.length) return;

  // Only meaningful for a live human champion with AP to spend.
  const champ = state.champions.find(
    c => c.id === state.activeChampionId && c.alive
  );
  if (!champ || champ.controller !== 'human' || champ.actionPoints <= 0) return;

  const canvas = ctx2d.canvas;
  const startTile = state.tiles[coordKey(champ.pos)];
  if (!startTile) return;

  const startProj = projectHex(startTile, camera, canvas);
  if (!startProj) return;

  // Route polyline: champion hex → every path hex (destination last).
  const centers = [startProj.center];
  const destKey = preview.keys[preview.keys.length - 1];
  const projByKey = new Map();
  for (const key of preview.keys) {
    const tile = state.tiles[key];
    if (!tile) return;
    const proj = projectHex(tile, camera, canvas);
    if (!proj) return;
    projByKey.set(key, proj);
    centers.push(proj.center);
  }

  // Path-hex outlines (destination excluded — it gets its own terminal),
  // batched into one stroke.
  ctx2d.beginPath();
  for (const key of preview.keys) {
    if (key === destKey) continue;
    traceHex(ctx2d, projByKey.get(key).corners);
  }
  ctx2d.strokeStyle = PATH_PREVIEW_COLOR;
  ctx2d.lineWidth = PATH_PREVIEW_WIDTH;
  ctx2d.stroke();

  // Route line through hex centers, from the champion's own hex.
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

  // Destination terminal: white outline + filled center dot.
  const dest = projByKey.get(destKey);
  ctx2d.beginPath();
  traceHex(ctx2d, dest.corners);
  ctx2d.strokeStyle = PATH_DEST_COLOR;
  ctx2d.lineWidth = PATH_DEST_WIDTH;
  ctx2d.stroke();

  const refDist = Math.sqrt(
    (dest.corners[0].x - dest.center.x) ** 2 +
    (dest.corners[0].y - dest.center.y) ** 2
  );
  if (refDist > 1) {
    ctx2d.beginPath();
    ctx2d.arc(dest.center.x, dest.center.y, refDist * PATH_DEST_DOT_FRAC, 0, Math.PI * 2);
    ctx2d.fillStyle = PATH_DEST_COLOR;
    ctx2d.fill();
  }
}
