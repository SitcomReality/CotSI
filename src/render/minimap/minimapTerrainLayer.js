/**
 * minimapTerrainLayer.js — 2D canvas rendering of the minimap terrain layer.
 *
 * Draws explored hexes as colored ellipses, with fog opacity for visible vs.
 * explored-but-not-visible tiles. Caches the terrain bitmap and only redraws
 * when the fog-of-war revision changes.
 */

import { parseKey } from '../../engine/rules/hexGrid.js';
import { hexCenter } from '../hexmap3d/hexWorldSpace.js';
import { TERRAIN_COLOR } from '../hexmap3d/terrain/terrainMesh.js';
import { MINIMAP_SIZE, PADDING, getTerrainCtx } from './minimapDom.js';

// ---- Helpers ----

const HEX_RADIUS = 1.0; // matches hexWorldSpace.HEX_RADIUS

/**
 * Compute the bounding box of a set of hex coordinates in world space.
 * Returns { minX, maxX, minZ, maxZ }.
 */
function hexBounds(hexes) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const h of hexes) {
    const { x, z } = hexCenter(h.q, h.r);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
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

  // Resolve palette
  const palette = G.biomePalette || {};

  // Draw each explored hex as a small colored dot
  const hexW = HEX_RADIUS * scale;
  const hexH = HEX_RADIUS * 0.75 * scale;

  for (const key of explored) {
    const tile = G.tiles[key];
    if (!tile) continue;

    const { x, z } = hexCenter(tile.q, tile.r);
    const px = (x - offsetX) * scale + PADDING;
    const py = (z - offsetZ) * scale + PADDING;

    const isVisible = visibleSet.has(key);
    const color = palette[tile.terrain] || TERRAIN_COLOR[tile.terrain] || [0.3, 0.3, 0.3];

    ctx.globalAlpha = isVisible ? 1.0 : 0.3;
    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.ellipse(px, py, Math.max(hexW, 2), Math.max(hexH, 1.5), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;

  return { scale, offsetX, offsetZ };
}
