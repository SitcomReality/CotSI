/**
 * renderer.js — Canvas2D hex-map renderer for the analysis page.
 *
 * Draws terrain hexagons with entity overlays. Supports zoom and pan.
 * Pure rendering — no game state, no DOM, no Three.js.
 */
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import { FACTIONS } from '../../src/game/rules/factionData.js';
import { coordKey } from '../../src/engine/rules/hexGrid.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const SQRT3 = Math.sqrt(3);
const HEX_SIZE = 8; // base hex size in pixels (before zoom)

// ─── Hex math ────────────────────────────────────────────────────────────────

/**
 * Convert axial hex coords to pixel position (pointy-top layout).
 */
function hexToPixel(q, r, size) {
  return {
    x: size * (SQRT3 * q + SQRT3 / 2 * r),
    y: size * (3 / 2 * r),
  };
}

/**
 * Draw a single hexagon path on the context.
 * Caller is responsible for fill() / stroke().
 */
function drawHexPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ─── Camera ──────────────────────────────────────────────────────────────────

export function createCamera() {
  return {
    x: 0,
    y: 0,
    zoom: 1,
  };
}

export function screenToWorld(camera, sx, sy, canvasWidth, canvasHeight) {
  return {
    x: (sx - canvasWidth / 2) / camera.zoom - camera.x,
    y: (sy - canvasHeight / 2) / camera.zoom - camera.y,
  };
}

export function worldToScreen(camera, wx, wy, canvasWidth, canvasHeight) {
  return {
    x: (wx + camera.x) * camera.zoom + canvasWidth / 2,
    y: (wy + camera.y) * camera.zoom + canvasHeight / 2,
  };
}

/**
 * Fit the camera to show all hexes within the given radius,
 * centered at origin, with a small padding.
 */
export function fitCameraToRadius(camera, radius, canvasWidth, canvasHeight) {
  const corner = hexToPixel(radius, radius, HEX_SIZE);
  const mapWidth = Math.abs(corner.x) * 2 + HEX_SIZE * SQRT3;
  const mapHeight = Math.abs(corner.y) * 2 + HEX_SIZE * 1.5;

  const pad = 24;
  const availW = canvasWidth - pad * 2;
  const availH = canvasHeight - pad * 2;

  const zoomX = availW / mapWidth;
  const zoomY = availH / mapHeight;
  camera.zoom = Math.min(zoomX, zoomY, 4); // cap zoom at 4x
  camera.x = 0;
  camera.y = 0;
}

// ─── Noise overlay colors ────────────────────────────────────────────────────

/**
 * Map a raw elevation value (0–1) to a terrain-height color.
 * Emphasizes the thresholds used by terrain generation so the user can
 * see where water, land, and mountains form.
 */
function elevationColor(elev) {
  if (elev < 0.04) return '#0a1a3a';       // deep ocean — very dark navy
  if (elev < 0.07) return '#1a4a8a';       // shallow water — blue
  if (elev < 0.12) return '#3a8a8a';       // shore / beach — teal transition
  if (elev < 0.25) return '#4a9a4a';       // lowland — green
  if (elev < 0.45) return '#7aaa4a';       // midland — yellow-green
  if (elev < 0.65) return '#b8a030';       // highland — yellow
  if (elev < 0.80) return '#d48030';       // foothill — orange
  if (elev < 0.905) return '#c05030';      // sub-mountain — red-orange
  if (elev < 0.95) return '#a03030';       // mountain — deep red
  return '#e06040';                         // peak — bright warm red
}

/**
 * Map a raw moisture value (0–1) to a moisture color.
 * Shows the wetness gradient across the map.
 */
function moistureColor(moist) {
  if (moist < 0.10) return '#c8b050';       // very dry
  if (moist < 0.20) return '#b8a848';       // arid
  if (moist < 0.35) return '#8aaa4a';       // dry
  if (moist < 0.50) return '#6a9a3a';       // moderate
  if (moist < 0.65) return '#4a8a2a';       // moist
  if (moist < 0.80) return '#3a7a2a';       // wet
  return '#2a6a4a';                          // saturated
}

// ─── Render ──────────────────────────────────────────────────────────────────

/**
 * Render the full map: terrain hexes + entity markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} tiles           — flat tile map keyed by "q,r"
 * @param {object} entities        — { champions, mobs, traders }
 * @param {object} camera          — { x, y, zoom }
 * @param {object} options         — toggle flags and palette
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} dpr             — device pixel ratio
 * @param {string} [viewMode]      — 'terrain' | 'elevation' | 'moisture'
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
  const palette = options.palette || null;
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
    } else if (palette && palette[tile.terrain]) {
      const rgb = palette[tile.terrain];
      fillColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    } else {
      fillColor = TERRAIN[tile.terrain]?.fill || '#444';
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

  // Features: trees and knots (if toggled)
  if (options.showFeatures) {
    for (const key of tileKeys) {
      const tile = tiles[key];
      if (!tile.feature) continue;
      const p = hexToPixel(tile.q, tile.r, HEX_SIZE);

      if (tile.feature.kind === 'tree') {
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile.feature.kind === 'knot') {
        ctx.fillStyle = '#c8a832';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
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
