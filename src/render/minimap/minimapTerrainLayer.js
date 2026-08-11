/**
 * minimapTerrainLayer.js — 2D canvas rendering of the minimap terrain layer.
 *
 * Draws explored hexes as colored dots with fog opacity for visible vs.
 * explored-but-not-visible tiles. Caches the terrain bitmap and only redraws
 * when the minimap revision changes.
 *
 * Projection: world coordinates are rotated by CAMERA_YAW (π/6) before being
 * projected into minimap pixel space (see hexProjection.js), so the minimap
 * orientation matches the 3D view. The scale is floored at MINIMAP_MIN_HEX_PX
 * per hex — the "maximum zoom out". When the explored map fits at that floor
 * the whole map is drawn; otherwise the minimap shows a champion-centered
 * window the size of the canvas.
 *
 * Redraw cost is bounded by the window, never O(explored): at dense scales the
 * canvas is rebuilt pixel-by-pixel via ImageData (a fixed MINIMAP_SIZE² pass);
 * at larger scales individual explored hexes are drawn, and fit mode
 * guarantees the explored set cannot exceed the window's hex capacity.
 */

import { coordKey } from '../../engine/rules/hexGrid.js';
import { rotatedPoint, computeMinimapProjection, pixelToHex, HEX_RADIUS } from '../../engine/rules/hexProjection.js';
import { TERRAIN_COLOR } from '../../params/render/terrainParams.js';
import { MINIMAP_SIZE, PADDING, getTerrainCtx } from './minimapDom.js';
import {
  MINIMAP_HEX_ASPECT_RATIO,
  MINIMAP_EXPLORED_ALPHA,
  MINIMAP_PIXEL_BLIT_MAX_SCALE,
} from '../../params/render/minimapParams.js';

// ---- Module-level cache state ----
let lastMinimapRevision = -1;

export function resetTerrainCache() {
  lastMinimapRevision = -1;
}

/**
 * The champion the minimap window follows: the active champion when it is a
 * living human, otherwise any living human (matches the camera lock).
 */
function windowAnchorChampion(G) {
  const active = G.champions.find(
    (c) => c.id === G.activeChampionId && c.controller === 'human' && c.alive);
  return active || G.champions.find((c) => c.controller === 'human' && c.alive) || null;
}

/** Normalize a palette color (array of 0-1 floats) to a safe array. */
function colorRGB(color) {
  return Array.isArray(color) ? color : TERRAIN_COLOR.plains;
}

function rgbToCSS(rgb) {
  const [r, g, b] = rgb;
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

/**
 * Render the terrain (background) layer of the minimap.
 * Only redraws when the minimap revision changes.
 *
 * @param {object} G - Game state
 * @param {{ visible: Set<string>, explored: Set<string>, exploredBounds: object }} humanView
 * @returns {{ scale: number, offsetX: number, offsetZ: number } | null}
 *   The computed projection parameters, or null if nothing changed.
 */
export function renderTerrainLayer(G, humanView) {
  const ctx = getTerrainCtx();
  if (!ctx) return null;

  const { explored, exploredBounds } = humanView || { explored: new Set(), exploredBounds: null };

  // Check if we need to redraw the terrain cache
  const rev = G._minimapRevision || 0;
  if (rev === lastMinimapRevision) return null;

  lastMinimapRevision = rev;

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Window anchor: the champion the camera is locked to. Bounds are tracked in
  // rotated world space by the fog system (state._exploredBounds).
  const anchor = windowAnchorChampion(G);
  const championPoint = anchor ? rotatedPoint(anchor.pos.q, anchor.pos.r) : null;
  const proj = computeMinimapProjection(exploredBounds, championPoint);

  if (explored.size > 0) {
    const visible = humanView ? humanView.visible : new Set();
    if (proj.scale <= MINIMAP_PIXEL_BLIT_MAX_SCALE) {
      renderPixels(ctx, G, explored, visible, proj);
    } else {
      renderHexes(ctx, G, explored, visible, proj);
    }
  }

  return { scale: proj.scale, offsetX: proj.offsetX, offsetZ: proj.offsetZ };
}

/**
 * Dense draw path: scale is at or near the 1px/hex floor, so the canvas is
 * rebuilt pixel-by-pixel. Every canvas pixel is inverse-projected to the hex
 * containing it (pixelToHex) and colored from that hex's terrain; a single
 * putImageData commits the frame. Cost is a fixed MINIMAP_SIZE² pass
 * regardless of map radius.
 */
function renderPixels(ctx, G, explored, visible, proj) {
  const img = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
  const data = img.data;
  for (let py = 0; py < MINIMAP_SIZE; py++) {
    for (let px = 0; px < MINIMAP_SIZE; px++) {
      const { q, r } = pixelToHex(px, py, proj);
      const key = coordKey({ q, r });
      if (!explored.has(key)) continue;
      const tile = G.tiles[key];
      if (!tile) continue;
      const pal = (tile.biomeId && G.biomePalettes?.get(tile.biomeId)) || {};
      const color = colorRGB(pal[tile.terrain] || TERRAIN_COLOR[tile.terrain]);
      const off = (py * MINIMAP_SIZE + px) * 4;
      data[off] = Math.round(color[0] * 255);
      data[off + 1] = Math.round(color[1] * 255);
      data[off + 2] = Math.round(color[2] * 255);
      data[off + 3] = visible.has(key) ? 255 : Math.round(MINIMAP_EXPLORED_ALPHA * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Fit-mode draw path: scale is comfortably above the pixel floor, so explored
 * hexes are drawn as individual colored dots. Two passes batch globalAlpha by
 * visibility bucket (visible full, explored-only dimmed) to avoid per-tile
 * state changes. Iterating the explored set directly is bounded here: fit mode
 * means the whole explored map fits inside the canvas at this scale.
 */
function renderHexes(ctx, G, explored, visible, proj) {
  const hexW = HEX_RADIUS * proj.scale;
  const hexH = HEX_RADIUS * MINIMAP_HEX_ASPECT_RATIO * proj.scale;
  ctx.globalAlpha = 1;
  for (const key of explored) {
    if (visible.has(key)) drawHexDot(ctx, G, key, proj, hexW, hexH);
  }
  ctx.globalAlpha = MINIMAP_EXPLORED_ALPHA;
  for (const key of explored) {
    if (!visible.has(key)) drawHexDot(ctx, G, key, proj, hexW, hexH);
  }
  ctx.globalAlpha = 1;
}

function drawHexDot(ctx, G, key, proj, hexW, hexH) {
  const tile = G.tiles[key];
  if (!tile) return;
  const { x, z } = rotatedPoint(tile.q, tile.r);
  const px = (x - proj.offsetX) * proj.scale + PADDING;
  const py = (z - proj.offsetZ) * proj.scale + PADDING;
  const pal = (tile.biomeId && G.biomePalettes?.get(tile.biomeId)) || {};
  const color = colorRGB(pal[tile.terrain] || TERRAIN_COLOR[tile.terrain]);

  ctx.fillStyle = rgbToCSS(color);
  ctx.beginPath();
  ctx.ellipse(px, py, hexW, hexH, 0, 0, Math.PI * 2);
  ctx.fill();

  // River overlay: draw a smaller blue dot on river terrain tiles
  if (tile.terrain === 'river') {
    ctx.fillStyle = 'rgba(30, 120, 220, 0.7)';
    ctx.beginPath();
    ctx.ellipse(px, py, Math.max(hexW * 0.5, 1), Math.max(hexH * 0.5, 1), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
