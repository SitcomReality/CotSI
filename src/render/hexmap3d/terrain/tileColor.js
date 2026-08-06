import {
  TERRAIN_COLOR,
  LAKE_COLOR_MODULATION,
  RIVER_COLOR,
} from '../../../params/render/terrainParams.js';

/**
 * Memoized resolver for a tile's top-face color (per-tile biome palette →
 * lake/river modulation). Returns the same array instance per tile within one
 * mesh build.
 */
export function makeTopColorResolver(state) {
  const cache = new Map();
  return (tile) => {
    const key = `${tile.q},${tile.r}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const pal = (tile.biomeId && state.biomePalettes?.get(tile.biomeId)) || {};
    const baseColor = pal[tile.terrain] || TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;

    // River terrain is real water — a full river blue, independent of the
    // underlying terrain palette.
    if (tile.terrain === 'river') {
      cache.set(key, RIVER_COLOR);
      return RIVER_COLOR;
    }

    // Lakes get a darker, greener water color to distinguish from ocean
    const resolvedColor = (tile.terrain === 'water' && tile.waterType === 'lake')
      ? [baseColor[0] * LAKE_COLOR_MODULATION.r, baseColor[1] * LAKE_COLOR_MODULATION.g, baseColor[2] * LAKE_COLOR_MODULATION.b]
      : baseColor;

    cache.set(key, resolvedColor);
    return resolvedColor;
  };
}
