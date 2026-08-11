/**
 * biomeLegend.js — Biome-region legend builder.
 *
 * Builds HTML for biome-region display: counts tiles by biomeId and shows
 * each biome with its colour and percentage.
 *
 * Depends on module-level state (S.lastResult) via the mode dispatcher.
 */
import { S } from '../state.js';
import { getArchetype } from '../../../../src/game/rules/archetypes.js';
import { BIOME_COLORS } from '../render/theme.js';
import { countByTile, formatCount } from './legend.js';

/**
 * Build HTML for a biome-region legend.
 * Counts tiles by biomeId and shows each biome with its colour and percentage.
 * Falls back to S.lastResult.biomeDef when there are no tiles.
 *
 * @param {object[]} tiles
 * @returns {string}
 */
export function buildBiomeRegionLegend(tiles) {
  const total = tiles.length;

  if (!total) {
    const bid = S.lastResult.biomeDef?.id || 'biome_default';
    const biomeName = S.lastResult.biomeDef?.name || 'Default';
    const colorKey = bid.replace('biome_', '');
    const color = BIOME_COLORS[colorKey] ?? BIOME_COLORS.fallback;
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-label">${biomeName}</span>
    </div>`;
  }

  const counts = countByTile(tiles, t => t.biomeId);

  // Sort by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return sorted.map(([bid, count]) => {
    const def = getArchetype(bid);
    const biomeName = def?.name || bid;
    const colorKey = bid.replace('biome_', '');
    const color = BIOME_COLORS[colorKey] ?? BIOME_COLORS.fallback;
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-label">${biomeName}</span>
      <span class="legend-count">${formatCount(count, total)}</span>
    </div>`;
  }).join('');
}
