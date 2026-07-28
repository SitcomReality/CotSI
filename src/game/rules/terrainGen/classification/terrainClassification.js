import { DEFAULT_TERRAIN_RULES } from '../../../../params/game/worldParams.js';
import { TERRAIN_ELEVATION } from '../../../../params/render/terrainParams.js';

/**
 * Determine terrain type from elevation, moisture, temperature, slope, and biome rules.
 *
 * Temperature gates: cold water → ice, cold peaks → snow-capped peak.
 * Slope discriminates mountain vs plateau vs hill.
 * Tree line prevents forests above treeLineMax.
 * Uses DEFAULT_TERRAIN_RULES merged with biome-specific terrainRules.
 *
 * @param {number} elevation   - [0, 1] elevation field
 * @param {number} moisture    - [0, 1] moisture field
 * @param {number} temperature - [0, 1] temperature field
 * @param {number} slope       - [0, 1] slope (mountain/plateau/hill discrimination)
 * @param {object} [biomeDef]  - Biome archetype def (read for terrainRules)
 * @returns {string} terrain type
 */
export function classifyTerrain(elevation, moisture, temperature, slope, biomeDef) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven; frozen at low temperature
  if (elevation < R.waterMaxElevation) {
    if (temperature < R.freezeTempMax) return 'ice';
    if (moisture > R.waterMinMoisture) return 'water';
  }

  // Snow-capped peaks: high elevation + cold
  if (elevation > R.peakThreshold && temperature < R.snowLineMax) return 'peak';

  // Elevation gates
  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';
  if (elevation > R.peakThreshold)          return 'peak';

  // Mountain vs plateau: slope discriminates
  if (elevation > R.mountainThreshold) {
    return slope > R.plateauSlopeMin ? 'mountain' : 'plateau';
  }

  // Hills: moderate elevation, moderate slope
  if (elevation > R.hillElevationMin && slope > R.hillSlopeMin)
    return 'hill';

  const belowTreeLine = elevation < R.treeLineMax;

  if (belowTreeLine && moisture > R.denseForestMinMoisture) return 'denseForest';
  if (belowTreeLine && moisture > R.forestMinMoisture)      return 'forest';
  if (moisture < R.desertMaxMoisture)                       return 'desert';
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation) return 'marsh';

  return 'plains';
}

export function resolveElevation(terrain, biomeDef) {
  if (biomeDef?.terrainElevation?.[terrain] !== undefined) {
    return biomeDef.terrainElevation[terrain];
  }
  return TERRAIN_ELEVATION[terrain] || 0;
}
