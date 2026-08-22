// src/render/overlays/selectionRing.js
// Draws spinning golden arrow-triangles around the active champion's hex.
// Priority: 10 (above fog, below future particles)

import { worldToScreen } from './screenProjection.js';
import { graphicsSettings } from './graphicsSettings.js';
import { hexCenter3D, hexCornersXZ, tileSurfaceY } from '../hexmap3d/hexMapRenderer.js';
import { getDerivedHumanView } from './overlayStack.js';
import {
  ORBIT_FRAC,
  SELECTION_RING_SPEED,
  TRI_HALF_BASE,
  TRI_HEIGHT,
  SELECTION_RING_Y_OFFSET,
  SELECTION_RING_ALPHA,
  SELECTION_RING_BACKING_OFFSET_PX,
} from '../../params/render/overlayParams.js';

const GOLD_COLOR = '#ffbf00';
const BACK_COLOR = 'rgba(20, 20, 30, 0.5)';

export function renderSelectionRing(ctx2d, state, camera, time) {
  if (!graphicsSettings.effects.selectionRing) return;

  const champ = state.champions.find(c => c.id === state.activeChampionId && c.alive);
  if (!champ) return;

  const champKey = `${champ.pos.q},${champ.pos.r}`;

  // Fog-of-war: this layer renders above the fog overlay, so it must never
  // reveal a champion the human can't currently see (e.g. a bot acting in
  // unexplored black fog). The ring only draws when the active champion's
  // hex is inside the human's vision radius — a human's own hex always is.
  const humanView = getDerivedHumanView();
  if (humanView && !humanView.visible.has(champKey)) return;

  const tile = state.tiles[champKey];
  if (!tile) return;

  const surfaceY = tileSurfaceY(tile);
  const hc = hexCenter3D(tile.q, tile.r, surfaceY);

  const center = worldToScreen(hc.x, surfaceY + SELECTION_RING_Y_OFFSET, hc.z, camera, ctx2d.canvas);
  if (!center) return;

  // Project corners to get screen-space hex radius
  const corners3d = hexCornersXZ(hc.x, hc.z, 1.0);
  const corners = [];
  for (const c of corners3d) {
    const s = worldToScreen(c.x, surfaceY + SELECTION_RING_Y_OFFSET, c.z, camera, ctx2d.canvas);
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

  const angle = time * SELECTION_RING_SPEED;

  ctx2d.globalAlpha = SELECTION_RING_ALPHA;

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
    ctx2d.moveTo(bx - px * (halfBase + SELECTION_RING_BACKING_OFFSET_PX), by - py * (halfBase + SELECTION_RING_BACKING_OFFSET_PX));
    ctx2d.lineTo(tipX + nx * SELECTION_RING_BACKING_OFFSET_PX, tipY + ny * SELECTION_RING_BACKING_OFFSET_PX);
    ctx2d.lineTo(bx + px * (halfBase + SELECTION_RING_BACKING_OFFSET_PX), by + py * (halfBase + SELECTION_RING_BACKING_OFFSET_PX));
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
