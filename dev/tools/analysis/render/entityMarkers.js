/**
 * entityMarkers.js — Draw entity overlay markers on the map.
 *
 * Each function draws a specific entity type (bases, mobs,
 * traders, champions) as simple geometric markers.
 */
import { FACTIONS } from '../../../../src/game/rules/factionData.js';
import { hexToPixel, HEX_SIZE } from './hexMath.js';
import { BASE_MARKER, MOB_MARKER, TRADER_MARKER, CHAMP_MARKER } from './theme.js';

/**
 * Draw base squares on the map.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tiles   — tile map keyed by "q,r"
 * @param {Set<string>} baseKeys — set of "q,r" keys for tiles with bases
 */
export function drawBases(ctx, tiles, baseKeys) {
  const { halfSize, strokeWidth } = BASE_MARKER;
  for (const key of baseKeys) {
    const tile = tiles[key];
    if (!tile) continue;
    const p = hexToPixel(tile.q, tile.r, HEX_SIZE);
    const faction = tile.feature?.faction;
    const color = faction !== undefined ? FACTIONS[faction]?.color || '#fff' : '#fff';
    ctx.fillStyle = color;
    ctx.fillRect(p.x - halfSize, p.y - halfSize, halfSize * 2, halfSize * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(p.x - halfSize, p.y - halfSize, halfSize * 2, halfSize * 2);
  }
}

/**
 * Draw mob circles on the map.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} mobs   — array of mob entities with pos and alive
 * @param {number} size  — hex size (for pixel conversion)
 */
export function drawMobs(ctx, mobs, size) {
  const { radius, color } = MOB_MARKER;
  for (const m of mobs) {
    if (m.alive === false) continue;
    const p = hexToPixel(m.pos.q, m.pos.r, size);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/**
 * Draw trader circles on the map.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} traders — array of trader entities with pos
 * @param {number} size   — hex size (for pixel conversion)
 */
export function drawTraders(ctx, traders, size) {
  const { radius, color } = TRADER_MARKER;
  for (const t of traders) {
    const p = hexToPixel(t.pos.q, t.pos.r, size);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/**
 * Draw champion circles on the map, filled by faction color.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} champions — array of champion entities with pos, faction, alive
 * @param {number} size     — hex size (for pixel conversion)
 */
export function drawChampions(ctx, champions, size) {
  const { radius, fillOutline, strokeWidth } = CHAMP_MARKER;
  for (const ch of champions) {
    if (ch.alive === false) continue;
    const p = hexToPixel(ch.pos.q, ch.pos.r, size);
    const color = FACTIONS[ch.faction]?.color || '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = fillOutline;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}
