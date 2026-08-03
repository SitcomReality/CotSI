import { TERRAIN_ELEVATION, HEX_THICKNESS } from '../../../params/render/terrainParams.js';

// Elevation per terrain type (world units)
export const ELEVATION = TERRAIN_ELEVATION;
export { HEX_THICKNESS };

/**
 * Top surface Y of a tile, respecting per-tile elevation if set.
 * Uses tile.elevation (set during terrain gen from biome terrainElevation
 * overrides), falling back to the global TERRAIN_ELEVATION table.
 * This is the function entity placement should use.
 */
export function tileSurfaceY(tile) {
  const elev = (tile.elevation !== undefined && tile.elevation !== null)
    ? tile.elevation
    : (ELEVATION[tile.terrain] || 0);
  return elev + HEX_THICKNESS;
}

/**
 * Top surface Y of a tile of given terrain type.
 * This is the single source of truth for ground level.
 */
export function tileTopY(terrain) {
  return (ELEVATION[terrain] || 0) + HEX_THICKNESS;
}

/**
 * Resolve the elevation for a tile, preferring the per-tile value set
 * during generation (which accounts for biome terrainElevation overrides).
 * Falls back to the global ELEVATION table.
 */
export function resolveElev(tile, elevTable) {
  if (tile.elevation !== undefined && tile.elevation !== null) {
    return tile.elevation;
  }
  return elevTable[tile.terrain] || 0;
}
