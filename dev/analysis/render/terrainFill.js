/**
 * terrainFill.js — Resolve per-hex fill color based on view mode.
 *
 * Delegates to colorMaps for elevation / moisture overlays,
 * uses BIOME_COLORS for biome region view, the default-biome palette for
 * the single-biome terrain/rivers scheme, and falls back to the tile's
 * terrain type fill from game rules.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { elevationColor, moistureColor, densityColor } from './colorMaps.js';
import { BIOME_COLORS } from './theme.js';
import { featureDensity } from '../../../src/game/rules/terrainGen/features/featureDensity.js';
import { DEFAULT_TERRAIN_RULES } from '../../../src/params/game/worldParams.js';

/**
 * Determine the fill color for a single tile.
 *
 * @param {object} tile        — tile with elevation, moisture, baseMoisture, biomeId, terrain
 * @param {string} [viewMode]  — 'standard' | 'terrain' | 'biome' | 'elevation' | 'moisture' | 'baseMoisture' | 'density' | 'passability' | 'rivers' | 'blank'
 * @param {object} [palettes]  — biome→palette map, keyed by biomeId (standard view)
 * @param {object|null} [defaultPalette] — default biome palette or null (terrain / rivers views)
 * @returns {string} CSS color string
 */
export function resolveFillColor(tile, viewMode, palettes, defaultPalette) {
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

  if (viewMode === 'density') {
    // Impassable tiles don't get features — show as neutral grey
    if (!TERRAIN[tile.terrain]?.passable) return '#444';
    const dens = featureDensity(
      tile.terrain, tile.elevationField, tile.moisture, tile.slope,
      DEFAULT_TERRAIN_RULES.treeLineMax
    );
    return densityColor(dens);
  }

  if (viewMode === 'biome') {
    const bid = tile.biomeId || 'biome_default';
    const colorKey = bid.replace('biome_', '');
    return BIOME_COLORS[colorKey] ?? BIOME_COLORS.fallback;
  }

  // Terrain / rivers view — single-biome scheme: every tile uses the default
  // biome palette (the colours the legend shows), falling back to TERRAIN.fill
  // when there is no default palette (e.g. multi-biome mode).
  if (viewMode === 'terrain' || viewMode === 'rivers') {
    const rgb = defaultPalette && defaultPalette[tile.terrain];
    if (rgb) return `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`;
    return TERRAIN[tile.terrain]?.fill || '#444';
  }

  // Standard view — use biome palette colours (scaled to 0–255) or TERRAIN fallback
  const bid = tile.biomeId;
  const tilePalette = bid ? palettes[bid] : null;
  if (tilePalette && tilePalette[tile.terrain]) {
    const rgb = tilePalette[tile.terrain];
    return `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`;
  }

  return TERRAIN[tile.terrain]?.fill || '#444';
}
