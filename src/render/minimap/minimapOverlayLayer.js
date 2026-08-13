/**
 * minimapOverlayLayer.js — 2D canvas rendering of entities and the camera indicator.
 *
 * Draws bases, champions, mobs, and traders as colored shapes on the overlay canvas.
 * Also draws the 3D camera's orthographic viewport as a rotated rectangle.
 *
 * World coordinates are rotated by CAMERA_YAW (π/6) before projection to
 * minimap pixel space, matching the terrain layer and the 3D view.
 */

import { coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { getSceneContext } from '../hexmap3d/hexMapRenderer.js';
import { CAMERA_YAW } from '../hexmap3d/scene/cameraState.js';
import { MINIMAP_SIZE, PADDING, getOverlayCtx } from './minimapDom.js';
import {
  MINIMAP_BASE_MARKER_SIZE,
  MINIMAP_CHAMPION_DOT_RADIUS,
  MINIMAP_MOB_DOT_RADIUS,
  MINIMAP_TRADER_DOT_RADIUS,
  MINIMAP_INDICATOR_LINE_WIDTH,
  CAMERA_STRETCH_EPSILON,
} from '../../params/render/minimapParams.js';

// Pre-compute trig values for the camera yaw rotation
const COS_YAW = Math.cos(CAMERA_YAW);
const SIN_YAW = Math.sin(CAMERA_YAW);

/**
 * Project a world-space (x, z) to minimap pixel coords.
 * Applies the camera yaw rotation (CCW) so the minimap matches the 3D view.
 */
function worldToMinimap(x, z, scale, offsetX, offsetZ) {
  const x_rot = x * COS_YAW - z * SIN_YAW;
  const z_rot = x * SIN_YAW + z * COS_YAW;
  return {
    px: (x_rot - offsetX) * scale + PADDING,
    py: (z_rot - offsetZ) * scale + PADDING,
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
    ctx.fillRect(px - MINIMAP_BASE_MARKER_SIZE, py - MINIMAP_BASE_MARKER_SIZE, MINIMAP_BASE_MARKER_SIZE * 2, MINIMAP_BASE_MARKER_SIZE * 2);
  }

  // Draw champions (visible only; champions inside dungeons are hidden)
  for (const champ of G.champions) {
    if (!champ.alive || champ.dungeon) continue;
    const key = coordKey(champ.pos);
    if (!visible.has(key)) continue;
    const { x, z } = hexCenter(champ.pos.q, champ.pos.r);
    const { px, py } = worldToMinimap(x, z, scale, offsetX, offsetZ);
    ctx.fillStyle = factionColorCSS(champ.faction);
    ctx.beginPath();
    ctx.ellipse(px, py, MINIMAP_CHAMPION_DOT_RADIUS, MINIMAP_CHAMPION_DOT_RADIUS, 0, 0, Math.PI * 2);
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
      ctx.ellipse(px, py, MINIMAP_MOB_DOT_RADIUS, MINIMAP_MOB_DOT_RADIUS, 0, 0, Math.PI * 2);
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
      ctx.ellipse(px, py, MINIMAP_TRADER_DOT_RADIUS, MINIMAP_TRADER_DOT_RADIUS, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw camera viewport indicator (rectangle showing what the 3D camera sees)
  drawCameraIndicator(scale, offsetX, offsetZ);
}

/**
 * Draw the orthographic camera's viewport as a rotated rectangle on the overlay.
 *
 * The camera has a fixed yaw (CAMERA_YAW = π/6), so the ground-plane footprint
 * of the viewport is a rectangle rotated by that same yaw around (targetX, targetZ),
 * stretched by 1/sin(pitch) in the camera's local up direction (pitch ≈ 51° makes
 * this ~1.29×). For the minimap indicator we apply the full correction so the
 * drawn shape accurately matches what the 3D camera captures.
 */
function drawCameraIndicator(scale, offsetX, offsetZ) {
  const ctx = getOverlayCtx();
  if (!ctx) return;

  const ctx3d = getSceneContext();
  if (!ctx3d) return;

  const camState = ctx3d.getCameraState();
  const { frustumSize, targetX, targetZ, aspect, pitch, yaw } = camState;

  // Half-extents in camera-local space
  const halfW = (frustumSize * aspect) / 2;
  const halfH = frustumSize / 2;

  // Ground-plane footprint of the orthographic frustum.
  // For an orthographic camera with non-zero pitch, following the parallel
  // projection rays backward from a camera-space corner (cx, cy) to the
  // ground plane (y=0) gives:
  //   x_ground = targetX + cx*cos(yaw) - cy*sin(yaw)/sin(pitch)
  //   z_ground = targetZ - cx*sin(yaw) - cy*cos(yaw)/sin(pitch)
  const sinPitch = Math.sin(pitch);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const stretch = sinPitch > CAMERA_STRETCH_EPSILON ? 1 / sinPitch : 1;

  // Four camera-space corners: (+halfW, +halfH), (+halfW, -halfH),
  // (-halfW, -halfH), (-halfW, +halfH)
  const corners = [
    { x: targetX + halfW * cosYaw - halfH * sinYaw * stretch,
      z: targetZ - halfW * sinYaw - halfH * cosYaw * stretch },
    { x: targetX + halfW * cosYaw + halfH * sinYaw * stretch,
      z: targetZ - halfW * sinYaw + halfH * cosYaw * stretch },
    { x: targetX - halfW * cosYaw + halfH * sinYaw * stretch,
      z: targetZ + halfW * sinYaw + halfH * cosYaw * stretch },
    { x: targetX - halfW * cosYaw - halfH * sinYaw * stretch,
      z: targetZ + halfW * sinYaw - halfH * cosYaw * stretch },
  ];

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = MINIMAP_INDICATOR_LINE_WIDTH;
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
