/**
 * riversLegend.js — Rivers legend builder.
 *
 * Builds HTML for the rivers overlay legend: terrain entries filtered
 * to existing types, river path count, moisture boost halo count, and
 * unaffected tile count.
 *
 * Pure computation: no DOM, no state mutation.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { RIVER, RIVER_BOOST_RADIUS } from '../render/theme.js';
import { hexesWithinRadius, coordKey } from '../../../src/engine/rules/hexGrid.js';
import { countByTile, formatCount, paletteToCss } from './legend.js';
import { TERRAIN_ORDER } from './terrainLegend.js';

/**
 * Build HTML for a rivers legend.
 * Shows terrain entries (filtered to existing), river path count,
 * moisture boost halo count, and unaffected tile count.
 *
 * River boost halo is computed by finding all tiles within radius 1
 * of any river tile, then subtracting the river tiles themselves.
 *
 * @param {object[]} tiles
 * @param {object|null} [palette] - Palette from S.lastResult.biomeDef?.palette
 * @returns {string}
 */
export function buildRiversLegend(tiles, palette) {
  const total = tiles.length;

  // Build a key->index map for fast lookup
  const tileMap = {};
  for (let i = 0; i < tiles.length; i++) {
    tileMap[coordKey(tiles[i])] = i;
  }

  // First pass: collect river tile keys
  const riverKeySet = new Set();
  for (const tile of tiles) {
    if (tile.isRiver) {
      riverKeySet.add(coordKey(tile));
    }
  }

  // Second pass: compute boost halo keys
  const offsets = hexesWithinRadius(RIVER_BOOST_RADIUS);
  const boostedKeySet = new Set();
  for (const riverKey of riverKeySet) {
    for (const offset of offsets) {
      // Parse the river tile coords to compute neighbor
      const [qStr, rStr] = riverKey.split(',');
      const nq = parseInt(qStr, 10) + offset.q;
      const nr = parseInt(rStr, 10) + offset.r;
      const nk = `${nq},${nr}`;
      // Only add if the neighbor is an actual tile on the map
      if (tileMap[nk] !== undefined) {
        boostedKeySet.add(nk);
      }
    }
  }

  // Third pass: count categories
  const riverCount = riverKeySet.size;
  let boostCount = 0;
  for (const key of boostedKeySet) {
    if (!riverKeySet.has(key)) {
      boostCount++;
    }
  }
  const unaffectedCount = total - riverCount - boostCount;

  // Terrain entries (same filtered + ordered logic as buildTerrainLegend)
  const terrainCounts = countByTile(tiles, t => t.terrain);
  let html = '';

  for (const t of TERRAIN_ORDER) {
    if ((terrainCounts[t] || 0) === 0) continue;
    const swatch = palette && palette[t]
      ? paletteToCss(palette[t])
      : (TERRAIN[t]?.fill || '#444');
    html += `<div class="legend-item">
      <span class="legend-swatch" style="background:${swatch}"></span>
      <span class="legend-label">${TERRAIN[t]?.label || t}</span>
      <span class="legend-count">${formatCount(terrainCounts[t], total)}</span>
    </div>`;
  }

  // River path entry
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:${RIVER.pathColor}"></span>
    <span class="legend-label">River path</span>
    <span class="legend-count">${formatCount(riverCount, total)}</span>
  </div>`;

  // Moisture boost halo entry
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:${RIVER.boostColor}"></span>
    <span class="legend-label">Moisture boost</span>
    <span class="legend-count">${formatCount(boostCount, total)}</span>
  </div>`;

  // Unaffected entry (no swatch, just informational)
  html += `<div class="legend-item">
    <span class="legend-swatch" style="background:transparent;border-color:transparent"></span>
    <span class="legend-label">Unaffected</span>
    <span class="legend-count">${formatCount(unaffectedCount, total)}</span>
  </div>`;

  return html;
}
