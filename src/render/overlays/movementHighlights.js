// 2D overlay layer: highlights hexes adjacent to the active human champion.
// Priority 5 (above fog, below selection ring).
//
// Verdigris wash per aestheticConventions §4.4 (--st-move). Gold is reserved
// for selection (§13.6), so movement reads as a soft green wash instead of the
// old harsh debug-yellow fill.

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileSurfaceY } from '../hexmap3d/hexMapRenderer.js';
import { getDerivedMoveHighlights, getHoveredKey } from './overlayStack.js';
import { TERRAIN } from '../../game/rules/terrainTypes.js';
import { occupiedByTrader } from '../../game/state/entityQueries.js';
import { MOVE_ALLOWED_WIDTH, MOVE_HOVER_WIDTH, MOVE_DASH, MOVE_DASH_SPEED, HIGHLIGHT_RADIUS_FRAC, HIGHLIGHT_Y_OFFSET } from '../../params/render/overlayParams.js';

// ---------------------------------------------------------------------------
// Visual constants — radial verdigris wash (feathered toward hex edges)
// ---------------------------------------------------------------------------
const ALLOWED_FILL_CENTER = 'rgba(0, 204, 136, 0.28)';
const ALLOWED_FILL_EDGE   = 'rgba(0, 204, 136, 0.06)';
const ALLOWED_STROKE      = 'rgba(0, 204, 136, 0.85)';

const HOVER_FILL_CENTER   = 'rgba(0, 204, 136, 0.42)';
const HOVER_FILL_EDGE     = 'rgba(0, 204, 136, 0.12)';
const HOVER_STROKE        = '#7affd4';

// ---------------------------------------------------------------------------
// Render entry point
// ---------------------------------------------------------------------------
export function renderMovementHighlights(ctx2d, state, camera, time) {
  const champ = state.champions.find(
    c => c.id === state.activeChampionId && c.alive
  );
  if (!champ || champ.controller !== 'human' || champ.actionPoints <= 0) return;

  const allowed = getDerivedMoveHighlights() || [];
  if (allowed.length === 0) return;

  const canvas = ctx2d.canvas;
  const hoveredKey = getHoveredKey();

  for (const key of allowed) {
    const tile = state.tiles[key];
    if (!tile) continue;

    // Skip hexes occupied by a trader
    const hasTrader = occupiedByTrader(state, key);
    if (hasTrader) continue;

    // Safety guard: never highlight impassable terrain
    if (!TERRAIN[tile.terrain]?.passable) continue;

    const surfaceY = tileSurfaceY(tile);
    const hc = hexCenter3D(tile.q, tile.r, surfaceY);

    // Project the hex center (for the radial gradient) and all 6 corners
    const centerScreen = worldToScreen(hc.x, surfaceY + HIGHLIGHT_Y_OFFSET, hc.z, camera, canvas);
    if (!centerScreen) continue;

    const corners = hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS_FRAC);
    const screenPoints = [];
    let behindCamera = false;

    for (const c of corners) {
      const s = worldToScreen(c.x, surfaceY + HIGHLIGHT_Y_OFFSET, c.z, camera, canvas);
      if (!s) {
        behindCamera = true;
        break;
      }
      screenPoints.push(s);
    }

    if (behindCamera) continue;

    const isHovered = key === hoveredKey;
    const width  = isHovered ? MOVE_HOVER_WIDTH : MOVE_ALLOWED_WIDTH;

    ctx2d.beginPath();
    ctx2d.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < 6; i++) {
      ctx2d.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx2d.closePath();

    // Soft radial wash — brightest at the hex center, feathered at the edges
    const refDist = Math.sqrt(
      (screenPoints[0].x - centerScreen.x) ** 2 +
      (screenPoints[0].y - centerScreen.y) ** 2
    );
    const grad = ctx2d.createRadialGradient(
      centerScreen.x, centerScreen.y, 0,
      centerScreen.x, centerScreen.y, refDist
    );
    grad.addColorStop(0, isHovered ? HOVER_FILL_CENTER : ALLOWED_FILL_CENTER);
    grad.addColorStop(1, isHovered ? HOVER_FILL_EDGE : ALLOWED_FILL_EDGE);

    ctx2d.fillStyle = grad;
    ctx2d.fill();

    // Animated marching dash along the hex outline
    ctx2d.strokeStyle = isHovered ? HOVER_STROKE : ALLOWED_STROKE;
    ctx2d.setLineDash(MOVE_DASH);
    ctx2d.lineDashOffset = -time * MOVE_DASH_SPEED;
    ctx2d.lineWidth = width;
    ctx2d.stroke();
    ctx2d.setLineDash([]);
  }
}
