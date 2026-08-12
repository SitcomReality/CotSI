// 2D overlay layer: minimal reachable-range hint for the active human champion.
// Priority 5 (above fog, below the path preview).
//
// Deliberately understated (dev/docs/movementAndOccupation.md §5): thin STATIC hex
// outlines — no fill wash, no animated marching dashes, no per-hex radial
// gradients. Every eligible hex batches into ONE path + ONE stroke per frame,
// so the range reads as a quiet suggestion instead of drowning the landscape,
// at a fraction of the old per-frame cost. Hexes in unexplored black fog are
// never highlighted.

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileSurfaceY } from '../hexmap3d/hexMapRenderer.js';
import { getDerivedMoveHighlights, getDerivedHumanView, getHoveredKey } from './overlayStack.js';
import { TERRAIN } from '../../game/rules/terrainTypes.js';
import { occupiedByTrader } from '../../game/state/entityQueries.js';
import { MOVE_ALLOWED_WIDTH, MOVE_HOVER_WIDTH, HIGHLIGHT_RADIUS_FRAC, HIGHLIGHT_Y_OFFSET } from '../../params/render/overlayParams.js';

const ALLOWED_STROKE = 'rgba(0, 204, 136, 0.32)';
const HOVER_STROKE = '#7affd4';

export function renderMovementHighlights(ctx2d, state, camera, time) {
  const champ = state.champions.find(
    c => c.id === state.activeChampionId && c.alive
  );
  if (!champ || champ.controller !== 'human' || champ.actionPoints <= 0) return;

  const allowed = getDerivedMoveHighlights() || [];
  if (allowed.length === 0) return;

  const humanView = getDerivedHumanView();
  const explored = humanView?.explored || null;

  const canvas = ctx2d.canvas;
  const hoveredKey = getHoveredKey();

  // Project every eligible hex, batching the outlines into a single path.
  let hoveredPoints = null;
  ctx2d.beginPath();
  let any = false;
  for (const key of allowed) {
    // Never advertise movement into unexplored black fog.
    if (explored && !explored.has(key)) continue;

    const tile = state.tiles[key];
    if (!tile) continue;

    // Skip hexes occupied by a trader
    if (occupiedByTrader(state, key)) continue;

    // Safety guard: never highlight impassable terrain
    if (!TERRAIN[tile.terrain]?.passable) continue;

    const surfaceY = tileSurfaceY(tile);
    const hc = hexCenter3D(tile.q, tile.r, surfaceY);
    const corners3d = hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS_FRAC);
    const pts = [];
    let behindCamera = false;
    for (const c of corners3d) {
      const s = worldToScreen(c.x, surfaceY + HIGHLIGHT_Y_OFFSET, c.z, camera, canvas);
      if (!s) { behindCamera = true; break; }
      pts.push(s);
    }
    if (behindCamera) continue;

    ctx2d.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 6; i++) ctx2d.lineTo(pts[i].x, pts[i].y);
    ctx2d.closePath();
    if (key === hoveredKey) hoveredPoints = pts;
    any = true;
  }
  if (!any) return;

  // One stroke for the whole range
  ctx2d.strokeStyle = ALLOWED_STROKE;
  ctx2d.lineWidth = MOVE_ALLOWED_WIDTH;
  ctx2d.stroke();

  // Slightly brighter stroke on the hovered reachable hex
  if (hoveredPoints) {
    ctx2d.beginPath();
    ctx2d.moveTo(hoveredPoints[0].x, hoveredPoints[0].y);
    for (let i = 1; i < 6; i++) ctx2d.lineTo(hoveredPoints[i].x, hoveredPoints[i].y);
    ctx2d.closePath();
    ctx2d.strokeStyle = HOVER_STROKE;
    ctx2d.lineWidth = MOVE_HOVER_WIDTH;
    ctx2d.stroke();
  }
}
