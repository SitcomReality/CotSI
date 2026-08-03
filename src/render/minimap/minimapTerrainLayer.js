/**
 * minimapTerrainLayer.js — 2D canvas rendering of the minimap terrain layer.
 *
 * Draws explored hexes as colored ellipses, with fog opacity for visible vs.
 * explored-but-not-visible tiles. Caches the terrain bitmap and only redraws
 * when the fog-of-war revision changes.
 *
 * World coordinates are rotated by CAMERA_YAW (π/6) before projection to
 * minimap pixel space, so the minimap orientation matches the 3D view.
 */

import { parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { TERRAIN_COLOR } from '../../params/render/terrainParams.js';
import { CAMERA_YAW } from '../hexmap3d/scene/cameraState.js';
import { MINIMAP_SIZE, PADDING, getTerrainCtx } from './minimapDom.js';
import {
  MINIMAP_HEX_ASPECT_RATIO,
  MINIMAP_EXPLORED_ALPHA,
  MINIMAP_MIN_DOT_WIDTH_PX,
  MINIMAP_MIN_DOT_HEIGHT_PX,
} from '../../params/render/minimapParams.js';

// ---- Helpers ----

const HEX_RADIUS = 1.0; // matches hexWorldSpace.HEX_RADIUS

// Pre-compute trig values for the camera yaw rotation
const COS_YAW = Math.cos(CAMERA_YAW);
const SIN_YAW = Math.sin(CAMERA_YAW);

/**
 * Rotate a world-space (x, z) point by CAMERA_YAW counter-clockwise.
 * @returns {{ x_rot: number, z_rot: number }}
 */
function rotateWorld(x, z) {
  return {
    x_rot: x * COS_YAW - z * SIN_YAW,
    z_rot: x * SIN_YAW + z * COS_YAW,
  };
}

/**
 * Compute the bounding box of a set of hex coordinates in rotated world space.
 * Returns { minX, maxX, minZ, maxZ }.
 */
function hexBounds(hexes) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const h of hexes) {
    const { x, z } = hexCenter(h.q, h.r);
    const { x_rot, z_rot } = rotateWorld(x, z);
    if (x_rot < minX) minX = x_rot;
    if (x_rot > maxX) maxX = x_rot;
    if (z_rot < minZ) minZ = z_rot;
    if (z_rot > maxZ) maxZ = z_rot;
  }
  // Account for hex size (corners extend beyond center)
  minX -= HEX_RADIUS;
  maxX += HEX_RADIUS;
  minZ -= HEX_RADIUS;
  maxZ += HEX_RADIUS;
  return { minX, maxX, minZ, maxZ };
}

function rgbToCSS(rgb) {
  if (typeof rgb === 'string') return rgb;
  const [r, g, b] = rgb;
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

// ---- Module-level cache state ----
let lastExploredRevision = -1;

export function resetTerrainCache() {
  lastExploredRevision = -1;
}

/**
 * Render the terrain (background) layer of the minimap.
 * Only redraws when fog-of-war revision changes.
 *
 * @param {object} G - Game state
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView
 * @returns {{ scale: number, offsetX: number, offsetZ: number } | null}
 *   The computed projection parameters, or null if nothing was drawn.
 */
export function renderTerrainLayer(G, humanView) {
  const ctx = getTerrainCtx();
  if (!ctx) return null;

  const { explored } = humanView || { explored: new Set() };

  // Check if we need to redraw the terrain cache
  const fogRev = G._fogRevision || 0;
  if (fogRev === lastExploredRevision) return null;

  lastExploredRevision = fogRev;

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Get explored hex coordinates
  const exploredHexes = [];
  for (const key of explored) {
    exploredHexes.push(parseKey(key));
  }
  if (exploredHexes.length === 0) return null;

  // Compute bounding box and scale
  const bounds = hexBounds(exploredHexes);
  const mapW = bounds.maxX - bounds.minX;
  const mapH = bounds.maxZ - bounds.minZ;
  const availW = MINIMAP_SIZE - PADDING * 2;
  const availH = MINIMAP_SIZE - PADDING * 2;

  const scaleX = mapW > 0 ? availW / mapW : 1;
  const scaleY = mapH > 0 ? availH / mapH : 1;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = bounds.minX;
  const offsetZ = bounds.minZ;

  // Precompute scale corrected for hex aspect ratio
  const visibleSet = humanView ? humanView.visible : new Set();

  // Draw each explored hex as a small colored dot
  const hexW = HEX_RADIUS * scale;
  const hexH = HEX_RADIUS * MINIMAP_HEX_ASPECT_RATIO * scale;

  for (const key of explored) {
    const tile = G.tiles[key];
    if (!tile) continue;

    // Resolve biome palette per tile
    const pal = (tile.biomeId && G.biomePalettes?.get(tile.biomeId)) || {};
    const { x, z } = hexCenter(tile.q, tile.r);
    const { x_rot, z_rot } = rotateWorld(x, z);
    const px = (x_rot - offsetX) * scale + PADDING;
    const py = (z_rot - offsetZ) * scale + PADDING;

    const isVisible = visibleSet.has(key);
    const color = pal[tile.terrain] || TERRAIN_COLOR[tile.terrain] || [0.3, 0.3, 0.3];

    ctx.globalAlpha = isVisible ? 1.0 : MINIMAP_EXPLORED_ALPHA;
    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.ellipse(px, py, Math.max(hexW, MINIMAP_MIN_DOT_WIDTH_PX), Math.max(hexH, MINIMAP_MIN_DOT_HEIGHT_PX), 0, 0, Math.PI * 2);
    ctx.fill();

    // River overlay: draw a smaller blue dot on river-path tiles
    if (tile.isRiver) {
      ctx.globalAlpha = isVisible ? 0.85 : 0.5;
      ctx.fillStyle = 'rgba(30, 120, 220, 0.7)';
      ctx.beginPath();
      ctx.ellipse(px, py, Math.max(hexW * 0.5, 1), Math.max(hexH * 0.5, 1), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;

  return { scale, offsetX, offsetZ };
}
