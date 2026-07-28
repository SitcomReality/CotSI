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
 * @param {object} tile        — tile with elevation, moisture, baseMoisture, biomeId, terrain
 * @param {string} [viewMode]  — 'terrain' | 'biome' | 'elevation' | 'moisture' | 'baseMoisture' | 'passability' | 'blank'
 * @param {object} [palettes]  — biome→palette map, keyed by biomeId
 * @returns {string} CSS color string
 */
export function resolveFillColor(tile, viewMode, palettes) {
  if (viewMode === 'blank') return '#000';

  if (viewMode === 'elevation' && tile.elevationField !== undefined) {
    return elevationColor(tile.elevationField);
  }

  if (viewMode === 'moisture' && tile.moisture !== undefined) {
    return moistureColor(tile.moisture);
  }

  if (viewMode === 'baseMoisture' && tile.baseMoisture !== undefined) {
    return moistureColor(tile.baseMoisture);
  }

  if (viewMode === 'passability') {
    return TERRAIN[tile.terrain]?.passable ? '#3a7a3a' : '#8b3a3a';
  }

  if (viewMode === 'biome') {
    const bid = tile.biomeId || 'biome_default';
    if (bid === 'biome_default') return BIOME_COLORS.default;
    if (bid === 'biome_lush')    return BIOME_COLORS.lush;
    if (bid === 'biome_arid')    return BIOME_COLORS.arid;
    return BIOME_COLORS.fallback;
  }

  // Terrain view — use biome palette colours (scaled to 0–255) or TERRAIN fallback
  const bid = tile.biomeId;
  const tilePalette = bid ? palettes[bid] : null;
  if (tilePalette && tilePalette[tile.terrain]) {
    const rgb = tilePalette[tile.terrain];
    return `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`;
  }

  return TERRAIN[tile.terrain]?.fill || '#444';
}
