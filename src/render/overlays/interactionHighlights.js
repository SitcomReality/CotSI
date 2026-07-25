// src/render/overlays/interactionHighlights.js
// 2D overlay layer: animated interaction indicators on hexes with mobs, enemy
// champions, traders, and faction bases.
// Priority 7 (between movement highlights at 5 and selection ring at 10).
//
// Color semantics (not faction-identity):
//   - Combat (mobs, enemy champs)     → red-orange (#d46a4a) — danger
//   - Trade (beneficial)              → teal-green (#40c090) — beneficial
//   - Faction base (neutral)          → cool blue   (#6a7a9a) — neutral

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileTopY } from '../hexmap3d/hexMapRenderer.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { getInteractionHighlights, getHoveredKey } from './overlayStack.js';

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------
const HIGHLIGHT_RADIUS = 0.92;

// Teeth (combat / neutral indicator)
const TEETH_PER_EDGE = 1;          // one tooth per hex edge = 6 teeth total
const TEETH_BASE_WIDTH_FRAC = 0.08; // half-base width as fraction of hex radius
const TEETH_BASE_HEIGHT   = 0.12;   // base tooth height in hex-radius units
const TEETH_EXTRA         = 0.14;   // oscillation amplitude
const TEETH_SPEED         = 0.003;

// Trade indicator — pulsing ring
const RING_BASE_RADIUS_FRAC = 0.60; // ring radius as fraction of hex radius
const RING_LINE_WIDTH_FRAC  = 0.08; // ring stroke width as fraction of hex radius
const RING_PULSE_SPEED      = 0.003;

// Hover-faded rendering
const HOVER_ALPHA = 0.30;

// Semantic colors
const COMBAT_MOB_COLOR  = '#d46a4a';
const TRADE_COLOR       = '#40c090';
const BASE_NEUTRAL_COLOR = '#6a7a9a';

// ---------------------------------------------------------------------------
// Draw chomping-teeth around a hex given its projected screen corners + center
// ---------------------------------------------------------------------------
function drawTeeth(ctx, center, corners, time, alphaMod) {
  const anim = Math.sin(time * TEETH_SPEED) * 0.5 + 0.5; // 0..1
  const toothH = TEETH_BASE_HEIGHT + anim * TEETH_EXTRA;

  // Reference screen-scale: distance from center to first corner
  const refDist = Math.sqrt(
    (corners[0].x - center.x) ** 2 +
    (corners[0].y - center.y) ** 2
  );
  const halfBase = refDist * TEETH_BASE_WIDTH_FRAC;

  ctx.globalAlpha = alphaMod;

  for (let edge = 0; edge < 6; edge++) {
    const p1 = corners[edge];
    const p2 = corners[(edge + 1) % 6];

    for (let t = 0; t < TEETH_PER_EDGE; t++) {
      const frac = (t + 0.5) / TEETH_PER_EDGE;
      // Edge midpoint
      const ex = p1.x + (p2.x - p1.x) * frac;
      const ey = p1.y + (p2.y - p1.y) * frac;

      // Inward direction (edge → center)
      const dx = center.x - ex;
      const dy = center.y - ey;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) continue;
      const nx = dx / len;
      const ny = dy / len;

      // Perpendicular (edge-aligned) direction
      const px = -ny;
      const py =  nx;

      const tipDist = refDist * toothH;
      const tipX = ex + nx * tipDist;
      const tipY = ey + ny * tipDist;

      ctx.beginPath();
      ctx.moveTo(ex - px * halfBase, ey - py * halfBase);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(ex + px * halfBase, ey + py * halfBase);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Draw a pulsing ring (trader indicator)
// ---------------------------------------------------------------------------
function drawPulsingRing(ctx, center, corners, time, alphaMod) {
  const refDist = Math.sqrt(
    (corners[0].x - center.x) ** 2 +
    (corners[0].y - center.y) ** 2
  );
  if (refDist < 1) return;

  // Gentle breathing: radius oscillates ±10 %
  const pulse = Math.sin(time * RING_PULSE_SPEED) * 0.10;
  const ringRadius = refDist * (RING_BASE_RADIUS_FRAC + pulse);
  const lineWidth = refDist * RING_LINE_WIDTH_FRAC;

  ctx.globalAlpha = alphaMod;

  // Dark backing for visibility on light terrain
  ctx.beginPath();
  ctx.arc(center.x, center.y, ringRadius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(20, 20, 30, 0.4)';
  ctx.lineWidth = lineWidth + 4;
  ctx.stroke();

  // Teal ring
  ctx.beginPath();
  ctx.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = TRADE_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Project a hex to screen, returning { center, corners } or null if behind cam
// ---------------------------------------------------------------------------
function projectHex(q, r, surfaceY, camera, canvas) {
  const hc = hexCenter3D(q, r, surfaceY);
  const corners3d = hexCornersXZ(hc.x, hc.z, HIGHLIGHT_RADIUS);

  const center = worldToScreen(hc.x, surfaceY + 0.06, hc.z, camera, canvas);
  if (!center) return null;

  const corners = [];
  for (const c of corners3d) {
    const s = worldToScreen(c.x, surfaceY + 0.06, c.z, camera, canvas);
    if (!s) return null;
    corners.push(s);
  }
  return { center, corners };
}

// ---------------------------------------------------------------------------
// Render entry point — called each frame by the overlay registry
// ---------------------------------------------------------------------------
export function renderInteractionHighlights(ctx2d, state, camera, time) {
  const activeChamp = state.champions.find(
    c => c.id === state.activeChampionId && c.alive
  );
  const isHumanActive = activeChamp && activeChamp.controller === 'human';
  const canvas = ctx2d.canvas;

  const interactionHighlights = getInteractionHighlights() || new Map();
  const hoveredKey = getHoveredKey();

  // -----------------------------------------------------------------------
  // 1. Draw full indicators for adjacent interaction hexes
  // -----------------------------------------------------------------------
  for (const [key, info] of interactionHighlights) {
    const tile = state.tiles[key];
    if (!tile) continue;

    const surfaceY = tileTopY(tile.terrain);
    const proj = projectHex(tile.q, tile.r, surfaceY, camera, canvas);
    if (!proj) continue;

    const { center, corners } = proj;

    switch (info.type) {
      case 'mob': {
        ctx2d.fillStyle = COMBAT_MOB_COLOR;
        drawTeeth(ctx2d, center, corners, time, 1);
        break;
      }

      case 'champion': {
        ctx2d.fillStyle = COMBAT_MOB_COLOR;
        drawTeeth(ctx2d, center, corners, time, 1);
        break;
      }

      case 'trader': {
        drawPulsingRing(ctx2d, center, corners, time, 0.85);
        break;
      }

      case 'base': {
        ctx2d.fillStyle = BASE_NEUTRAL_COLOR;
        drawTeeth(ctx2d, center, corners, time, 1);
        break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Hover-only faded indicator (non-adjacent hex with an entity)
  // -----------------------------------------------------------------------
  if (!hoveredKey) return;
  if (interactionHighlights.has(hoveredKey)) return; // already drawn above

  const tile = state.tiles[hoveredKey];
  if (!tile) return;

  const surfaceY = tileTopY(tile.terrain);
  const proj = projectHex(tile.q, tile.r, surfaceY, camera, canvas);
  if (!proj) return;

  const { center, corners } = proj;

  // Determine what entity (if any) lives on the hovered hex
  const mob = state.mobs && state.mobs.find(
    m => m.alive && coordKey(m.pos) === hoveredKey
  );
  const other = state.champions && state.champions.find(
    c => c.alive && c.id !== state.activeChampionId &&
         coordKey(c.pos) === hoveredKey
  );
  const trader = state.traders && state.traders.find(
    t => coordKey(t.pos) === hoveredKey
  );
  const baseFeature = tile.feature && tile.feature.kind === 'base'
    ? tile.feature : null;

  if (mob) {
    ctx2d.fillStyle = COMBAT_MOB_COLOR;
    drawTeeth(ctx2d, center, corners, time, HOVER_ALPHA);
  } else if (other) {
    ctx2d.fillStyle = COMBAT_MOB_COLOR;
    drawTeeth(ctx2d, center, corners, time, HOVER_ALPHA);
  } else if (trader) {
    drawPulsingRing(ctx2d, center, corners, time, HOVER_ALPHA);
  } else if (baseFeature) {
    ctx2d.fillStyle = BASE_NEUTRAL_COLOR;
    drawTeeth(ctx2d, center, corners, time, HOVER_ALPHA);
  }
}
