/**
 * terrainFill.js — Resolve per-hex fill color based on view mode.
 *
 * Delegates to colorMaps for elevation / moisture overlays,
 * uses BIOME_COLORS for biome region view, and falls back to
 * the tile's terrain type fill from game rules.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { elevationColor, moistureColor } from './colorMaps.js';
import { BIOME_COLORS } from './theme.js';

/**
 * Determine the fill color for a single tile.
 *
 * @param {object} tile        — tile with elevation, moisture, biomeId, terrain
 * @param {string} [viewMode]  — 'terrain' | 'biome' | 'elevation' | 'moisture'
 * @param {object} [palettes]  — biome→palette map, keyed by biomeId
 * @returns {string} CSS color string
 */
export function resolveFillColor(tile, viewMode, palettes) {
  if (viewMode === 'elevation' && tile.elevation !== undefined) {
    return elevationColor(tile.elevation);
  }

  if (viewMode === 'moisture' && tile.moisture !== undefined) {
    return moistureColor(tile.moisture);
  }

  if (viewMode === 'biome') {
    const bid = tile.biomeId || 'biome_default';
    if (bid === 'biome_default') return BIOME_COLORS.default;
    if (bid === 'biome_lush')    return BIOME_COLORS.lush;
    if (bid === 'biome_arid')    return BIOME_COLORS.arid;
    return BIOME_COLORS.fallback;
  }

  // Default terrain view
  const bid = tile.biomeId;
  const tilePalette = bid ? palettes[bid] : null;
  if (tilePalette && tilePalette[tile.terrain]) {
    const rgb = tilePalette[tile.terrain];
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  return TERRAIN[tile.terrain]?.fill || '#444';
}
