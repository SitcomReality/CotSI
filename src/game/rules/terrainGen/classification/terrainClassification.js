import { DEFAULT_TERRAIN_RULES } from '../../../../params/game/worldParams.js';
import { TERRAIN_ELEVATION } from '../../../../params/render/terrainParams.js';
import { neighbors } from '../../../../engine/rules/hexGrid.js';

/**
 * Check whether a hex is adjacent to water, using a lookup predicate.
 * The lookup should return truthy for any hex that counts as water (provisional
 * water during chunk gen, or actual water/ice tiles during post-processing).
 *
 * @param {number}   q         - Hex q coordinate
 * @param {number}   r         - Hex r coordinate
 * @param {function} lookup    - (nq, nr) => truthy if that hex is water
 * @returns {boolean}
 */
function isAdjacentToWater(q, r, lookup) {
  for (const n of neighbors({ q, r })) {
    if (lookup(n.q, n.r)) return true;
  }
  return false;
}

/**
 * Determine terrain type from elevation, moisture, temperature, slope, and biome rules.
 *
 * Temperature gates: cold water → ice. Peaks have no temperature variant yet
 * (a snow-capped peak terrain was promised but never implemented).
 * Slope discriminates mountain vs plateau vs hill.
 * Tree line prevents forests above treeLineMax.
 * Uses DEFAULT_TERRAIN_RULES merged with biome-specific terrainRules.
 *
 * When spatial info is provided, land adjacent to water is classified as beach —
 * a 1-hex transition band between water and interior terrain.
 *
 * @param {number}   elevation   - [0, 1] elevation field
 * @param {number}   moisture    - [0, 1] moisture field
 * @param {number}   temperature - [0, 1] temperature field
 * @param {number}   slope       - [0, 1] slope (mountain/plateau/hill discrimination)
 * @param {object}   [biomeDef]  - Biome archetype def (read for terrainRules)
 * @param {number}   [q]         - Hex q coordinate (for water adjacency check)
 * @param {number}   [r]         - Hex r coordinate (for water adjacency check)
 * @param {function} [tileLookup]- (nq, nr) => truthy if hex is water/ice
 * @returns {string} terrain type
 */
export function classifyTerrain(elevation, moisture, temperature, slope, biomeDef, q, r, tileLookup) {
  const R = { ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules };

  // Water: elevation-driven; frozen at low temperature
  if (elevation < R.waterMaxElevation) {
    if (temperature < R.freezeTempMax) return 'ice';
    if (moisture > R.waterMinMoisture) return 'water';
  }

  // Beach: land adjacent to water — 1-hex transition band.
  // Check is after water/ice (those are never beach) but before other terrain,
  // so beach wins over forest, desert, hill, etc.
  if (q !== null && q !== undefined && r !== null && r !== undefined && tileLookup) {
    if (isAdjacentToWater(q, r, tileLookup)) return 'beach';
  }

  // Floating islands: separate phenomenon, not a mountain subtype
  if (elevation > R.floatingIslandThreshold) return 'floatingIsland';

  // Mountain vs plateau: slope discriminates.
  // Peaks are a capstone within mountains — every peak is also above
  // mountainThreshold, guaranteeing mountain >= peak in area.
  if (elevation > R.mountainThreshold) {
    if (elevation > R.peakThreshold) {
      return 'peak';
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
