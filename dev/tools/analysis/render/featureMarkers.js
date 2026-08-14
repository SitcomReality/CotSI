/**
 * featureMarkers.js — Draw map features (trees, bushes, etc.).
 *
 * Features are small decorative markers drawn on top of terrain tiles.
 * Each feature kind has its own drawing recipe defined in theme.js.
 */
import { hexToPixel, HEX_SIZE } from './hexMath.js';
import { FEATURES } from './theme.js';

/**
 * Draw all visible features on the map.
 *
 * Supported kinds: blessedFont, knot, bush, treasureChest.
 * Unknown kinds are silently skipped.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tiles    — tile map keyed by "q,r"
 * @param {string[]} tileKeys — list of all tile keys to iterate
 */
export function drawFeatures(ctx, tiles, tileKeys) {
  for (const key of tileKeys) {
    const tile = tiles[key];
    if (!tile.feature) continue;
    const p = hexToPixel(tile.q, tile.r, HEX_SIZE);

    const cfg = FEATURES[tile.feature.kind];
    if (!cfg) continue;

    // All features start with a filled circle
    ctx.fillStyle = cfg.fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cfg.radius, 0, Math.PI * 2);
    ctx.fill();

    // blessedFont overlay: cross-hair
    if (tile.feature.kind === 'blessedFont' && cfg.crossStroke) {
      ctx.strokeStyle = cfg.crossStroke;
      ctx.lineWidth = cfg.crossWidth;
      ctx.beginPath();
      ctx.moveTo(p.x - cfg.crossLen, p.y);
      ctx.lineTo(p.x + cfg.crossLen, p.y);
      ctx.moveTo(p.x, p.y - cfg.crossLen);
      ctx.lineTo(p.x, p.y + cfg.crossLen);
      ctx.stroke();
    }
  }
}

