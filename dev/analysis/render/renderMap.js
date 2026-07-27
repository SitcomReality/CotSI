/**
 * renderMap.js — Full map renderer for the analysis page.
 *
 * Orchestrates the draw pipeline: terrain hexes with fill-color
 * resolution, then entity/feature/debris markers on top.
 * Drawing utilities live in sibling modules; visual constants
 * live in theme.js.
 */
import { coordKey } from '../../../src/engine/rules/hexGrid.js';
import { hexToPixel, drawHexPath, HEX_SIZE } from './hexMath.js';
import { resolveFillColor } from './terrainFill.js';
import { drawBases, drawMobs, drawTraders, drawChampions } from './entityMarkers.js';
import { drawFeatures, drawDebris } from './featureMarkers.js';
import { CULL_MARGIN } from './theme.js';

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
 * @param {string} [viewMode]      — 'terrain' | 'biome' | 'elevation' | 'moisture' | 'passability' | 'blank'
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

    const fillColor = resolveFillColor(tile, viewMode, palettes);

    drawHexPath(ctx, p.x, p.y, HEX_SIZE * 0.95);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Track bases
    if (options.showBases && tile.feature?.kind === 'base') {
      baseKeys.add(key);
    }
  }

  // Draw entity markers on top
  if (options.showBases && baseKeys.size > 0) drawBases(ctx, tiles, baseKeys);
  if (options.showMobs   && mobs)             drawMobs(ctx, mobs, HEX_SIZE);
  if (options.showTraders && traders)         drawTraders(ctx, traders, HEX_SIZE);
  if (options.showChampions && champions)     drawChampions(ctx, champions, HEX_SIZE);
  if (options.showFeatures)                   drawFeatures(ctx, tiles, tileKeys);
  if (options.showDebris)                     drawDebris(ctx, tiles, tileKeys);

  ctx.restore();
}
