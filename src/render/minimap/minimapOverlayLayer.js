/**
 * minimapOverlayLayer.js — 2D canvas rendering of entities and the camera indicator.
 *
 * Draws bases, champions, mobs, and traders as colored shapes on the overlay canvas.
 * Also draws the 3D camera's orthographic viewport as a white rectangle.
 */

import { coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { getSceneContext } from '../hexmap3d/hexMapRenderer.js';
import { MINIMAP_SIZE, PADDING, getOverlayCtx } from './minimapDom.js';

/**
 * Project a world-space (x, z) to minimap pixel coords.
 */
function worldToMinimap(x, z, scale, offsetX, offsetZ) {
  return {
    px: (x - offsetX) * scale + PADDING,
    py: (z - offsetZ) * scale + PADDING,
  };
}

/**
 * Render the overlay layer (entities + camera indicator).
 * Always redrawn each frame.
 *
 * @param {object} G - Game state
 * @param {{ visible: Set<string> }} humanView
 * @param {number} scale - Current minimap scale
 * @param {number} offsetX - Current world X offset
 * @param {number} offsetZ - Current world Z offset
 */
export function renderOverlayLayer(G, humanView, scale, offsetX, offsetZ) {
  const ctx = getOverlayCtx();
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  const visible = humanView ? humanView.visible : new Set();

  // Draw bases (visible only)
  for (const key of visible) {
    const tile = G.tiles[key];
    if (!tile || tile.feature?.kind !== 'base') continue;
    const p = parseKey(key);
    const { x, z } = hexCenter(p.q, p.r);
    const { px, py } = worldToMinimap(x, z, scale, offsetX, offsetZ);
    ctx.fillStyle = factionColorCSS(tile.feature.faction);
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }

  // Draw champions (visible only)
  for (const champ of G.champions) {
    if (!champ.alive) continue;
    const key = coordKey(champ.pos);
    if (!visible.has(key)) continue;
    const { x, z } = hexCenter(champ.pos.q, champ.pos.r);
    const { px, py } = worldToMinimap(x, z, scale, offsetX, offsetZ);
    ctx.fillStyle = factionColorCSS(champ.faction);
    ctx.beginPath();
    ctx.ellipse(px, py, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw mobs (visible only)
  if (G.mobs) {
    for (const mob of G.mobs) {
      if (!mob.alive) continue;
      const key = coordKey(mob.pos);
      if (!visible.has(key)) continue;
      const { x, z } = hexCenter(mob.pos.q, mob.pos.r);
      const { px, py } = worldToMinimap(x, z, scale, offsetX, offsetZ);
      ctx.fillStyle = 'rgba(120, 100, 80, 0.8)';
      ctx.beginPath();
      ctx.ellipse(px, py, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw traders (visible only)
  if (G.traders) {
    for (const trader of G.traders) {
      const key = coordKey(trader.pos);
      if (!visible.has(key)) continue;
      const { x, z } = hexCenter(trader.pos.q, trader.pos.r);
      const { px, py } = worldToMinimap(x, z, scale, offsetX, offsetZ);
      ctx.fillStyle = 'rgba(74, 191, 154, 0.9)';
      ctx.beginPath();
      ctx.ellipse(px, py, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw camera viewport indicator (rectangle showing what the 3D camera sees)
  drawCameraIndicator(scale, offsetX, offsetZ);
}

/**
 * Draw the orthographic camera's viewport as a white rectangle on the overlay.
 */
function drawCameraIndicator(scale, offsetX, offsetZ) {
  const ctx = getOverlayCtx();
  if (!ctx) return;

  const ctx3d = getSceneContext();
  if (!ctx3d) return;

  const camState = ctx3d.getCameraState();
  const { frustumSize, targetX, targetZ, aspect } = camState;

  // The orthographic camera sees a rectangle of size (frustumSize * aspect) x frustumSize
  // centered on (targetX, targetZ) in the ground plane.
  const halfW = (frustumSize * aspect) / 2;
  const halfH = frustumSize / 2;

  // Project the four corners of the camera frustum to minimap coords
  const corners = [
    { x: targetX - halfW, z: targetZ - halfH },
    { x: targetX + halfW, z: targetZ - halfH },
    { x: targetX + halfW, z: targetZ + halfH },
    { x: targetX - halfW, z: targetZ + halfH },
  ];

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const first = worldToMinimap(corners[0].x, corners[0].z, scale, offsetX, offsetZ);
  ctx.moveTo(first.px, first.py);
  for (let i = 1; i < corners.length; i++) {
    const { px, py } = worldToMinimap(corners[i].x, corners[i].z, scale, offsetX, offsetZ);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

/**
 * Resolve a faction index to a CSS color string.
 * Uses the canonical color from factionData.js.
 */
function factionColorCSS(factionIndex) {
  const faction = FACTIONS[factionIndex];
  return faction ? faction.color : '#888';
}
