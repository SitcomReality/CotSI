import {
  TERRAIN_COLOR,
  LAKE_COLOR_MODULATION,
  RIVER_COLOR,
  RIVER_OVERLAY_COLOR,
  RIVER_OVERLAY_WEIGHT,
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

    // Carved river channels are real water — a full river blue, independent of
    // the underlying terrain palette. (The isRiver overlay below only applies
    // to impassable land river tiles that stay on the terrain mesh.)
    if (tile.riverCarved) {
      cache.set(key, RIVER_COLOR);
      return RIVER_COLOR;
    }

    // Lakes get a darker, greener water color to distinguish from ocean
    const resolvedColor = (tile.terrain === 'water' && tile.waterType === 'lake')
      ? [baseColor[0] * LAKE_COLOR_MODULATION.r, baseColor[1] * LAKE_COLOR_MODULATION.g, baseColor[2] * LAKE_COLOR_MODULATION.b]
      : baseColor;

    // River overlay on top face only — blend river blue into the terrain color
    const topColor = tile.isRiver
      ? [
          resolvedColor[0] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[0] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[1] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[1] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[2] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[2] * RIVER_OVERLAY_WEIGHT,
        ]
      : resolvedColor;

    cache.set(key, topColor);
    return topColor;
  };
}
