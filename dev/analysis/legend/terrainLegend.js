/**
 * terrainLegend.js — Terrain palette legend builder.
 *
 * Builds HTML for terrain palette swatches, filtered to terrain types
 * actually present in the tiles and sorted by TERRAIN_ORDER.
 * Uses biome palette colors when available, falling back to TERRAIN.fill.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { countByTile, formatCount, paletteToCss } from './legend.js';

// ─── Terrain display order ────────────────────────────────────────────────

export const TERRAIN_ORDER = ['plains', 'beach', 'forest', 'denseForest', 'desert', 'marsh', 'hill', 'plateau', 'mountain', 'peak', 'floatingIsland', 'water', 'ice', 'river'];

/**
 * Build HTML for terrain palette legend items.
 * Filters to terrain types actually present in the tiles, sorted by TERRAIN_ORDER.
 * Uses biome palette colors when available, falling back to TERRAIN.fill.
 *
 * @param {object[]} tiles
 * @param {object|null} [palette] - Palette from S.lastResult.biomeDef?.palette
 * @returns {string}
 */
export function buildTerrainLegend(tiles, palette) {
  const counts = countByTile(tiles, t => t.terrain);
  const total = tiles.length;

  return TERRAIN_ORDER
    .filter(t => (counts[t] || 0) > 0)
    .map(t => {
      const swatch = palette && palette[t]
        ? paletteToCss(palette[t])
        : (TERRAIN[t]?.fill || '#444');
      return `<div class="legend-item">
        <span class="legend-swatch" style="background:${swatch}"></span>
        <span class="legend-label">${TERRAIN[t]?.label || t}</span>
        <span class="legend-count">${formatCount(counts[t], total)}</span>
      </div>`;
    }).join('');
}
