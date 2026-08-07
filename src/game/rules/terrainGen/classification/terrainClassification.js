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
 * Temperature gates: cold water → ice.
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

  // Mountains cap the elevation range (steep highland); plateaus are flat
  // highlands that also fill the band where mountains used to begin, so the
  // high-elevation region reads as open plateau rather than impassable peaks.
  // The mid-band plateau is gated by plateauSlopeMax: the steepest high slopes
  // fall through to montane forest/desert/hill instead of flat-topping.
  if (elevation > R.mountainThreshold) {
    return slope > R.plateauSlopeMin ? 'mountain' : 'plateau';
  }
  if (elevation > R.plateauThreshold && slope <= R.plateauSlopeMax) return 'plateau';

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

/** Fallback elevation when neither the biome nor TERRAIN_ELEVATION know a terrain. */
const ELEVATION_FALLBACK = 0;

/** Terrains already warned about (warn once per unknown terrain, not per tile). */
const warnedMissingElevation = new Set();

export function resolveElevation(terrain, biomeDef) {
  if (biomeDef?.terrainElevation?.[terrain] !== undefined) {
    return biomeDef.terrainElevation[terrain];
  }
  // TERRAIN_ELEVATION is a render-domain table (3D Y-offset); a terrain absent
  // from both sources is a data gap that silently resolving to 0 would hide.
  if (TERRAIN_ELEVATION[terrain] === undefined) {
    if (!warnedMissingElevation.has(terrain)) {
      warnedMissingElevation.add(terrain);
      console.warn(`[terrainClassification] no elevation entry for terrain "${terrain}" — using ${ELEVATION_FALLBACK}`);
    }
    return ELEVATION_FALLBACK;
  }
  return TERRAIN_ELEVATION[terrain];
}
