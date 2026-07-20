// src/render/overlays/selectionRing.js
// Draws a pulsing ring around the active champion at their projected screen position.
// Priority: 10 (above fog, below future particles)

import { worldToScreen } from './screenProjection.js';
import { hexCenter3D, tileTopY } from '../hexmap3d/hexMapRenderer.js';

const RING_COLOR = '#ffe880';
const RING_RADIUS = 22; // base pixel radius
const RING_WIDTH = 3;

export function renderSelectionRing(ctx2d, state, camera, time) {
  const champ = state.champions.find(c => c.id === state.activeChampionId && c.alive);
  if (!champ) return;
  
  const tile = state.tiles[`${champ.pos.q},${champ.pos.r}`];
  if (!tile) return;
  
  const surfaceY = tileTopY(tile.terrain);
  const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
  const screen = worldToScreen(x, surfaceY + 0.18, z, camera, ctx2d.canvas);
  if (!screen) return;
  
  const pulse = 1 + Math.sin(time * 0.003) * 0.15;
  const radius = RING_RADIUS * pulse;
  
  ctx2d.beginPath();
  ctx2d.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx2d.strokeStyle = RING_COLOR;
  ctx2d.lineWidth = RING_WIDTH;
  ctx2d.shadowColor = RING_COLOR;
  ctx2d.shadowBlur = 8;
  ctx2d.stroke();
  ctx2d.shadowBlur = 0; // reset for other layers
}