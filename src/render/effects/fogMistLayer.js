// src/render/effects/fogMistLayer.js
// Draws dark mist over explored-but-not-visible hexes as 2D canvas polygons.
// Priority: 0 (draws first, underneath everything else)

import { worldToScreen } from './projection.js';
import { tileTopY } from '../hexmap3d/terrain.js';
import { hexCenter, hexCornersXZ } from '../hexmap3d/hexUtils.js';
import { getHumanView } from '../../game/vision.js';

const MIST_COLOR = 'rgba(10, 8, 4, 0.82)';
const MIST_OFFSET = 0.3;

// Generate 6 world-space corners for a hex, lifted to mist height
function getMistCornersWorld(q, r, terrain) {
  const topY = tileTopY(terrain) + MIST_OFFSET;
  const { x: cx, z: cz } = hexCenter(q, r);
  return hexCornersXZ(cx, cz).map(c => ({ x: c.x, y: topY, z: c.z }));
}

export function renderFogMist(ctx2d, state, camera, _time) {
  const { visible, explored } = getHumanView(state);
  const canvas = ctx2d.canvas;
  
  for (const [, tile] of Object.entries(state.tiles)) {
    const key = `${tile.q},${tile.r}`;
    if (!explored.has(key) || visible.has(key)) continue;
    
    const corners = getMistCornersWorld(tile.q, tile.r, tile.terrain);
    const screenPts = corners
      .map(c => worldToScreen(c.x, c.y, c.z, camera, canvas))
      .filter(Boolean);
    
    if (screenPts.length < 3) continue;
    
    ctx2d.beginPath();
    ctx2d.moveTo(screenPts[0].x, screenPts[0].y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx2d.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx2d.closePath();
    ctx2d.fillStyle = MIST_COLOR;
    ctx2d.fill();
  }
}