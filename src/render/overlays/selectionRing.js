// src/render/overlays/selectionRing.js
// Draws spinning golden arrow-triangles around the active champion's hex.
// Priority: 10 (above fog, below future particles)

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileTopY } from '../hexmap3d/hexMapRenderer.js';

// Visual constants
const ORBIT_FRAC     = 0.50; // orbit radius as fraction of hex radius
const SPEED          = 0.002;
const TRI_HALF_BASE  = 0.14; // half-base width as fraction of refDist
const TRI_HEIGHT     = 0.22; // triangle height as fraction of refDist

const GOLD_COLOR = '#ffbf00';
const BACK_COLOR = 'rgba(20, 20, 30, 0.5)';

export function renderSelectionRing(ctx2d, state, camera, time) {
  const champ = state.champions.find(c => c.id === state.activeChampionId && c.alive);
  if (!champ) return;

  const tile = state.tiles[`${champ.pos.q},${champ.pos.r}`];
  if (!tile) return;

  const surfaceY = tileTopY(tile.terrain);
  const hc = hexCenter3D(tile.q, tile.r, surfaceY);

  const center = worldToScreen(hc.x, surfaceY + 0.18, hc.z, camera, ctx2d.canvas);
  if (!center) return;

  // Project corners to get screen-space hex radius
  const corners3d = hexCornersXZ(hc.x, hc.z, 1.0);
  const corners = [];
  for (const c of corners3d) {
    const s = worldToScreen(c.x, surfaceY + 0.18, c.z, camera, ctx2d.canvas);
    if (!s) return;
    corners.push(s);
  }

  const refDist = Math.sqrt(
    (corners[0].x - center.x) ** 2 +
    (corners[0].y - center.y) ** 2
  );
  if (refDist < 1) return;

  const orbitR   = refDist * ORBIT_FRAC;
  const halfBase = refDist * TRI_HALF_BASE;
  const height   = refDist * TRI_HEIGHT;

  const angle = time * SPEED;

  ctx2d.globalAlpha = 0.85;

  // Two inward-pointing triangles orbiting opposite points on a circle
  for (let i = 0; i < 2; i++) {
    const a = angle + i * Math.PI;

    // Center of the triangle's base, on the orbit circle
    const bx = center.x + orbitR * Math.cos(a);
    const by = center.y + orbitR * Math.sin(a);

    // Inward direction (orbit point → hex center)
    const inDirX = center.x - bx;
    const inDirY = center.y - by;
    const inLen = Math.sqrt(inDirX * inDirX + inDirY * inDirY);
    if (inLen < 0.001) continue;
    const nx = inDirX / inLen;
    const ny = inDirY / inLen;

    // Tangent direction (perpendicular to inward)
    const px = -ny;
    const py =  nx;

    const tipX = bx + nx * height;
    const tipY = by + ny * height;

    // Dark backing for visibility on light terrain
    ctx2d.fillStyle = BACK_COLOR;
    ctx2d.beginPath();
    ctx2d.moveTo(bx - px * (halfBase + 2), by - py * (halfBase + 2));
    ctx2d.lineTo(tipX + nx * 2, tipY + ny * 2);
    ctx2d.lineTo(bx + px * (halfBase + 2), by + py * (halfBase + 2));
    ctx2d.closePath();
    ctx2d.fill();

    // Gold triangle (tip pointing toward hex center)
    ctx2d.fillStyle = GOLD_COLOR;
    ctx2d.beginPath();
    ctx2d.moveTo(bx - px * halfBase, by - py * halfBase);
    ctx2d.lineTo(tipX, tipY);
    ctx2d.lineTo(bx + px * halfBase, by + py * halfBase);
    ctx2d.closePath();
    ctx2d.fill();
  }

  ctx2d.globalAlpha = 1;
}
