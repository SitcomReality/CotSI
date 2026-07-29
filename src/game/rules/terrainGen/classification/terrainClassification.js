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

  // Floating islands: separate phenomenon, not a mountain subtype
  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';

  // Mountain vs plateau: slope discriminates.
  // Peaks are a capstone within mountains — every peak is also above
  // mountainThreshold, guaranteeing mountain >= peak in area.
  if (elevation > R.mountainThreshold) {
    if (elevation > R.peakThreshold) {
      return temperature < R.snowLineMax ? 'peak' : 'peak';
    }
    return slope > R.plateauSlopeMin ? 'mountain' : 'plateau';
  }

  const belowTreeLine = elevation < R.treeLineMax;

  if (belowTreeLine && moisture > R.denseForestMinMoisture) return 'denseForest';
  if (belowTreeLine && moisture > R.forestMinMoisture)      return 'forest';
  if (moisture < R.desertMaxMoisture)                       return 'desert';
  if (moisture > R.marshMinMoisture && elevation < R.marshMaxElevation) return 'marsh';

  // Hills: moderate elevation, moderate slope.
  // Placed after moisture checks so climate-driven terrain (forest, desert, marsh) gets
  // first pick of non-mountainous land. Hill becomes "elevated land that isn't climatically
  // distinctive" rather than a voracious gate that starves moisture-based types.
  if (elevation > R.hillElevationMin && slope > R.hillSlopeMin)
    return 'hill';

  return 'plains';
}

export function resolveElevation(terrain, biomeDef) {
  if (biomeDef?.terrainElevation?.[terrain] !== undefined) {
    return biomeDef.terrainElevation[terrain];
  }
  return TERRAIN_ELEVATION[terrain] || 0;
}
