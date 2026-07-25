// src/render/overlays/interactionHighlights.js
// 2D overlay layer: animated interaction indicators on hexes with mobs, enemy
// champions, traders, and faction bases.
// Priority 7 (between movement highlights at 5 and selection ring at 10).

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, hexCornersXZ, tileTopY } from '../hexmap3d/hexMapRenderer.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { getInteractionHighlights, getHoveredKey } from './overlayStack.js';

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------
const HIGHLIGHT_RADIUS = 0.92;

// Teeth (combat indicator)
const TEETH_PER_EDGE = 1;          // one tooth per hex edge = 6 teeth total
const TEETH_BASE_WIDTH_FRAC = 0.05; // half-base width as fraction of hex radius
const TEETH_BASE_HEIGHT   = 0.08;   // base tooth height in hex-radius units
const TEETH_EXTRA         = 0.10;   // oscillation amplitude
const TEETH_SPEED         = 0.003;

// Trade indicator
const TRADE_DOT_RADIUS = 3;        // px
const TRADE_ORBIT_FRAC = 0.20;     // orbit radius fraction of hex radius
const TRADE_SPEED       = 0.002;

// Base indicator
const BASE_RING_WIDTH = 2;         // px
const BASE_RING_FRAC  = 0.20;      // fraction of hex radius
const BASE_PULSE_FRAC = 0.06;      // oscillation amplitude (fraction of hex radius)
const BASE_SPEED      = 0.003;

// Hover-faded rendering
const HOVER_ALPHA = 0.30;
const HOVER_STAR_SCALE = 0.6;

// Colors
const COMBAT_MOB_COLOR     = '#d46a4a';
const COMBAT_CHAMP_COLOR   = '#f0e0c0';
const TRADE_COLOR          = '#c8b060';

// ---------------------------------------------------------------------------
// 5-pointed star path (for champion-fight indicator)
// ---------------------------------------------------------------------------
function starPath(ctx, cx, cy, outerR, innerR, rotation) {
  const step = Math.PI / 5; // 36°
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rotation + i * step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

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
        ctx2d.fillStyle = COMBAT_CHAMP_COLOR;
        drawTeeth(ctx2d, center, corners, time, 1);

        // Gold star at center
        const starR = 8;
        starPath(ctx2d, center.x, center.y, starR, starR * 0.4, time * 0.001);
        ctx2d.fillStyle = COMBAT_CHAMP_COLOR;
        ctx2d.globalAlpha = 0.85;
        ctx2d.fill();
        ctx2d.globalAlpha = 1;
        break;
      }

      case 'trader': {
        // Two dots orbiting the hex center
        const angle = time * TRADE_SPEED;
        const refDist = Math.sqrt(
          (corners[0].x - center.x) ** 2 +
          (corners[0].y - center.y) ** 2
        );
        const orbitR = refDist * TRADE_ORBIT_FRAC;

        ctx2d.fillStyle = TRADE_COLOR;
        ctx2d.globalAlpha = 0.85;
        for (let i = 0; i < 2; i++) {
          const a = angle + i * Math.PI;
          ctx2d.beginPath();
          ctx2d.arc(
            center.x + orbitR * Math.cos(a),
            center.y + orbitR * Math.sin(a),
            TRADE_DOT_RADIUS, 0, Math.PI * 2
          );
          ctx2d.fill();
        }
        ctx2d.globalAlpha = 1;
        break;
      }

      case 'base': {
        const factionIdx = info.entity.faction;
        const color = (FACTIONS[factionIdx] && FACTIONS[factionIdx].color) || '#888';
        const refDist = Math.sqrt(
          (corners[0].x - center.x) ** 2 +
          (corners[0].y - center.y) ** 2
        );
        const pulse = BASE_RING_FRAC + Math.sin(time * BASE_SPEED) * BASE_PULSE_FRAC;
        const ringR = refDist * (pulse / HIGHLIGHT_RADIUS);

        ctx2d.beginPath();
        ctx2d.arc(center.x, center.y, ringR, 0, Math.PI * 2);
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = BASE_RING_WIDTH;
        ctx2d.stroke();
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
    ctx2d.fillStyle = COMBAT_CHAMP_COLOR;
    drawTeeth(ctx2d, center, corners, time, HOVER_ALPHA);

    const starR = 5;
    starPath(ctx2d, center.x, center.y, starR, starR * 0.4, time * 0.001);
    ctx2d.globalAlpha = HOVER_ALPHA * 0.85;
    ctx2d.fill();
    ctx2d.globalAlpha = 1;
  } else if (trader) {
    const angle = time * TRADE_SPEED;
    const refDist = Math.sqrt(
      (corners[0].x - center.x) ** 2 +
      (corners[0].y - center.y) ** 2
    );
    const orbitR = refDist * TRADE_ORBIT_FRAC;

    ctx2d.fillStyle = TRADE_COLOR;
    ctx2d.globalAlpha = HOVER_ALPHA;
    for (let i = 0; i < 2; i++) {
      const a = angle + i * Math.PI;
      ctx2d.beginPath();
      ctx2d.arc(
        center.x + orbitR * Math.cos(a),
        center.y + orbitR * Math.sin(a),
        TRADE_DOT_RADIUS * 0.7, 0, Math.PI * 2
      );
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  } else if (baseFeature) {
    const factionIdx = baseFeature.faction;
    const color = (FACTIONS[factionIdx] && FACTIONS[factionIdx].color) || '#888';
    const refDist = Math.sqrt(
      (corners[0].x - center.x) ** 2 +
      (corners[0].y - center.y) ** 2
    );
    const pulse = BASE_RING_FRAC + Math.sin(time * BASE_SPEED) * BASE_PULSE_FRAC;
    const ringR = refDist * (pulse / HIGHLIGHT_RADIUS);

    ctx2d.globalAlpha = HOVER_ALPHA;
    ctx2d.beginPath();
    ctx2d.arc(center.x, center.y, ringR, 0, Math.PI * 2);
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = BASE_RING_WIDTH;
    ctx2d.stroke();
    ctx2d.globalAlpha = 1;
  }
}
