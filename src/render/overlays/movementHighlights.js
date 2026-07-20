// 2D overlay layer: highlights hexes adjacent to the active human champion.
// Priority 5 (above fog, below selection ring).

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileTopY } from '../hexmap3d/hexMapRenderer.js';
import { adjacentPassable } from '../../game/state/championMovement.js';
import { coordKey } from '../../engine/rules/hexGrid.js';

// ---------------------------------------------------------------------------
// Shared hover state (set by hover.js)
// ---------------------------------------------------------------------------
let hoveredKey = null;

export function setHoveredHexKey(key) {
  hoveredKey = key;
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------
const ALLOWED_FILL   = 'rgba(255, 232, 128, 0.35)';
const ALLOWED_STROKE = '#ffe880';
const ALLOWED_WIDTH  = 2;

const HOVER_FILL     = 'rgba(232, 228, 220, 0.55)';
const HOVER_STROKE   = '#e8e4dc';
const HOVER_WIDTH    = 3;

// Slightly smaller than the tile radius to fit inside hex borders
const HIGHLIGHT_RADIUS = 0.92;

// ---------------------------------------------------------------------------
// Render entry point
// ---------------------------------------------------------------------------
export function renderMovementHighlights(ctx2d, state, camera, _time) {
  const champ = state.champions.find(
    c => c.id === state.activeChampionId && c.alive
  );
  if (!champ || champ.controller !== 'human' || champ.moves <= 0) return;

  const allowed = adjacentPassable(state, champ);
  if (allowed.length === 0) return;

  const canvas = ctx2d.canvas;

  for (const key of allowed) {
    const tile = state.tiles[key];
    if (!tile) continue;

    const surfaceY = tileTopY(tile.terrain);
    const hc = hexCenter3D(tile.q, tile.r, surfaceY);

    // Project all 6 corners of the hex (slightly above surface)
    const corners = hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS);
    const screenPoints = [];
    let behindCamera = false;

    for (const c of corners) {
      const s = worldToScreen(c.x, surfaceY + 0.06, c.z, camera, canvas);
      if (!s) {
        behindCamera = true;
        break;
      }
      screenPoints.push(s);
    }

    if (behindCamera) continue;

    const isHovered = key === hoveredKey;
    const fill   = isHovered ? HOVER_FILL   : ALLOWED_FILL;
    const stroke = isHovered ? HOVER_STROKE : ALLOWED_STROKE;
    const width  = isHovered ? HOVER_WIDTH  : ALLOWED_WIDTH;

    ctx2d.beginPath();
    ctx2d.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < 6; i++) {
      ctx2d.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx2d.closePath();

    ctx2d.fillStyle = fill;
    ctx2d.fill();
    ctx2d.strokeStyle = stroke;
    ctx2d.lineWidth = width;
    ctx2d.stroke();
  }
}