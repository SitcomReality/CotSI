/**
 * renderMap.js — Full map renderer for the analysis page.
 *
 * Draws terrain hexagons with entity overlays (champions, mobs,
 * traders, bases, features, debris). Supports view modes for
 * elevation, moisture, biome, and terrain.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { FACTIONS } from '../../../src/game/rules/factionData.js';
import { coordKey } from '../../../src/engine/rules/hexGrid.js';
import { elevationColor, moistureColor } from './colorMaps.js';
import { hexToPixel, drawHexPath, HEX_SIZE } from './hexMath.js';

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
 * @param {string} [viewMode]      — 'terrain' | 'biome' | 'elevation' | 'moisture'
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
  const margin = size * 2;
  const vpLeft = -canvasWidth / 2 / camera.zoom - camera.x - margin;
  const vpRight = canvasWidth / 2 / camera.zoom - camera.x + margin;
  const vpTop = -canvasHeight / 2 / camera.zoom - camera.y - margin;
  const vpBottom = canvasHeight / 2 / camera.zoom - camera.y + margin;

  // Collect entity key sets for quick lookup
  const champKeys = new Set();
  const mobKeys = new Set();
  const traderKeys = new Set();
  const baseKeys = new Set();

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

    // Determine fill color
    let fillColor;
    if (viewMode === 'elevation' && tile.elevation !== undefined) {
      fillColor = elevationColor(tile.elevation);
    } else if (viewMode === 'moisture' && tile.moisture !== undefined) {
      fillColor = moistureColor(tile.moisture);
    } else if (viewMode === 'biome') {
      const bid = tile.biomeId || 'biome_default';
      if (bid === 'biome_default') fillColor = '#6a9a4a';
      else if (bid === 'biome_lush') fillColor = '#3a7a2a';
      else if (bid === 'biome_arid') fillColor = '#c8a050';
      else fillColor = '#888';
    } else {
      const bid = tile.biomeId;
      const tilePalette = bid ? palettes[bid] : null;
      if (tilePalette && tilePalette[tile.terrain]) {
        const rgb = tilePalette[tile.terrain];
        fillColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      } else {
        fillColor = TERRAIN[tile.terrain]?.fill || '#444';
      }
    }

    drawHexPath(ctx, p.x, p.y, HEX_SIZE * 0.95);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Track bases
    if (options.showBases && tile.feature?.kind === 'base') {
      baseKeys.add(key);
    }
  }

  // Draw entity markers on top
  // Bases
  if (options.showBases && baseKeys.size > 0) {
    for (const key of baseKeys) {
      const tile = tiles[key];
      if (!tile) continue;
      const p = hexToPixel(tile.q, tile.r, HEX_SIZE);
      const faction = tile.feature?.faction;
      const color = faction !== undefined ? FACTIONS[faction]?.color || '#fff' : '#fff';
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
    }
  }

  // Mobs
  if (options.showMobs && mobs) {
    for (const m of mobs) {
      if (m.alive === false) continue;
      const p = hexToPixel(m.pos.q, m.pos.r, HEX_SIZE);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#8B6914';
      ctx.fill();
    }
  }

  // Traders
  if (options.showTraders && traders) {
    for (const t of traders) {
      const p = hexToPixel(t.pos.q, t.pos.r, HEX_SIZE);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#20b2aa';
      ctx.fill();
    }
  }

  // Champions
  if (options.showChampions && champions) {
    for (const ch of champions) {
      if (ch.alive === false) continue;
      const p = hexToPixel(ch.pos.q, ch.pos.r, HEX_SIZE);
      const color = FACTIONS[ch.faction]?.color || '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // Features: trees, fruit trees, large trees, knots, bushes, vines (if toggled)
  if (options.showFeatures) {
    for (const key of tileKeys) {
      const tile = tiles[key];
      if (!tile.feature) continue;
      const p = hexToPixel(tile.q, tile.r, HEX_SIZE);

      switch (tile.feature.kind) {
        case 'tree':
          ctx.fillStyle = '#2d5a1e';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'fruitTree':
          ctx.fillStyle = '#3a8a2a';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#60c040';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x - 1.2, p.y);
          ctx.lineTo(p.x + 1.2, p.y);
          ctx.moveTo(p.x, p.y - 1.2);
          ctx.lineTo(p.x, p.y + 1.2);
          ctx.stroke();
          break;
        case 'largeTree':
          ctx.fillStyle = '#1d4a0e';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'knot':
          ctx.fillStyle = '#c8a832';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'bush':
          ctx.fillStyle = '#5a8a3a';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'vine':
          ctx.fillStyle = '#4a7a2a';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#6aaa4a';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    }
  }

  // Debris (if toggled)
  if (options.showDebris) {
    for (const key of tileKeys) {
      const tile = tiles[key];
      if (!tile.debris) continue;
      const p = hexToPixel(tile.q, tile.r, HEX_SIZE);

      let color;
      if (tile.debris.kind === 'tuft') color = '#5a7a3a';
      else if (tile.debris.kind === 'rock') color = '#777';
      else color = '#c878a0'; // flower

      ctx.fillStyle = color;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }

  ctx.restore();
}
