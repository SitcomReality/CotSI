/**
 * renderMap.js — Full map renderer for the analysis page.
 *
 * Orchestrates the draw pipeline: terrain hexes with fill-color
 * resolution, then entity/feature markers on top.
 * Drawing utilities live in sibling modules; visual constants
 * live in theme.js.
 */
import { coordKey, hexesWithinRadius } from '../../../../src/engine/rules/hexGrid.js';
import { hexToPixel, drawHexPath, HEX_SIZE } from './hexMath.js';
import { resolveFillColor } from './terrainFill.js';
import { drawBases, drawMobs, drawTraders, drawChampions, drawDungeons } from './entityMarkers.js';
import { drawFeatures } from './featureMarkers.js';
import { CULL_MARGIN, RIVER, RIVER_BOOST_RADIUS } from './theme.js';

/**
 * Render the full map: terrain hexes + entity markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tiles           — flat tile map keyed by "q,r"
 * @param {object} entities        — { champions, mobs, traders }
 * @param {object} camera          — { x, y, zoom }
 * @param {object} options         — toggle flags and palettes map
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} dpr             — device pixel ratio
 * @param {string} [viewMode]      — 'standard' | 'terrain' | 'biome' | 'elevation' | 'moisture' | 'passability' | 'rivers' | 'blank'
 */
export function renderMap(ctx, tiles, entities, camera, options, canvasWidth, canvasHeight, dpr, viewMode) {
  const size = HEX_SIZE * camera.zoom;
  const { champions, mobs, traders } = entities;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Apply camera transform
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(camera.x, camera.y);

  // Compute viewport bounds in world space (for frustum culling)
  const margin = size * CULL_MARGIN;
  const vpLeft   = -canvasWidth  / 2 / camera.zoom - camera.x - margin;
  const vpRight  =  canvasWidth  / 2 / camera.zoom - camera.x + margin;
  const vpTop    = -canvasHeight / 2 / camera.zoom - camera.y - margin;
  const vpBottom =  canvasHeight / 2 / camera.zoom - camera.y + margin;

  // Collect entity key sets for quick lookup
  const champKeys = new Set();
  const mobKeys   = new Set();
  const traderKeys = new Set();
  const baseKeys  = new Set();
  const dungeonKeys = new Set();

  if (options.showChampions && champions) {
    for (const ch of champions) {
      if (ch.alive !== false) champKeys.add(coordKey(ch.pos));
    }
  }
  if (options.showMobs && mobs) {
    for (const m of mobs) {
      if (m.alive !== false) mobKeys.add(coordKey(m.pos));
    }
  }
  if (options.showTraders && traders) {
    for (const t of traders) traderKeys.add(coordKey(t.pos));
  }

  // Draw terrain hexes
  const palettes = options.palettes || {};
  const tileKeys = Object.keys(tiles);

  for (const key of tileKeys) {
    const tile = tiles[key];
    const p = hexToPixel(tile.q, tile.r, HEX_SIZE);

    // Frustum cull
    if (p.x < vpLeft || p.x > vpRight || p.y < vpTop || p.y > vpBottom) continue;

    const fillColor = resolveFillColor(tile, viewMode, palettes, options.defaultPalette);

    drawHexPath(ctx, p.x, p.y, HEX_SIZE * 0.95);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Track bases + dungeons
    if (options.showBases && tile.feature?.kind === 'base') {
      baseKeys.add(key);
    }
    if (options.showDungeons && tile.feature?.kind === 'dungeon') {
      dungeonKeys.add(key);
    }
  }

  // Draw river overlay (moisture boost halo + river-path highlight)
  if (viewMode === 'rivers') {
    // Find all river tiles and compute boost halo set
    const riverKeys = new Set();
    for (const key of tileKeys) {
      if (tiles[key].terrain === 'river') riverKeys.add(key);
    }

    if (riverKeys.size > 0) {
      const offsets = hexesWithinRadius(RIVER_BOOST_RADIUS);
      const boostedKeys = new Set();
      for (const key of riverKeys) {
        boostedKeys.add(key);
        const [q, r] = key.split(',').map(Number);
        for (const n of offsets) {
          boostedKeys.add(coordKey({ q: q + n.q, r: r + n.r }));
        }
      }

      // Draw moisture boost halo (semi-transparent blue on boosted tiles)
      for (const key of boostedKeys) {
        const tile = tiles[key];
        if (!tile) continue;
        if (riverKeys.has(key)) continue; // river tiles get their own fill below
        const p = hexToPixel(tile.q, tile.r, HEX_SIZE);
        drawHexPath(ctx, p.x, p.y, HEX_SIZE * 0.95);
        ctx.fillStyle = RIVER.boostColor;
        ctx.fill();
      }

      // Draw river-path tiles (brighter blue)
      for (const key of riverKeys) {
        const tile = tiles[key];
        const p = hexToPixel(tile.q, tile.r, HEX_SIZE);
        drawHexPath(ctx, p.x, p.y, HEX_SIZE * 0.95);
        ctx.fillStyle = RIVER.pathColor;
        ctx.fill();
      }
    }
  }

  // Draw entity markers on top
  if (options.showBases && baseKeys.size > 0) drawBases(ctx, tiles, baseKeys);
  if (options.showDungeons && dungeonKeys.size > 0) drawDungeons(ctx, tiles, dungeonKeys);
  if (options.showMobs   && mobs)             drawMobs(ctx, mobs, HEX_SIZE);
  if (options.showTraders && traders)         drawTraders(ctx, traders, HEX_SIZE);
  if (options.showChampions && champions)     drawChampions(ctx, champions, HEX_SIZE);
  if (options.showFeatures)                   drawFeatures(ctx, tiles, tileKeys);

  ctx.restore();
}
