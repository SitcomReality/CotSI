import { coordKey } from '../../../../engine/rules/hexGrid.js';
import { DEFAULT_TERRAIN_RULES } from '../../../../params/game/worldParams.js';

/**
 * Classify a tile as provisional water from elevation and moisture alone.
 *
 * Primary gate: elevation below waterMaxElevation.
 * Secondary gate: moisture above waterMinMoisture (prevents flooding desert basins).
 * Returns true if both gates pass — the tile will be provisional water.
 *
 * @param {number} elevation    - [0, 1] elevation field
 * @param {number} moisture     - [0, 1] moisture field
 * @param {object} terrainRules - terrain rule thresholds
 * @returns {boolean}
 */
export function isProvisionalWater(elevation, moisture, terrainRules) {
  if (elevation >= terrainRules.waterMaxElevation) return false;
  return moisture > terrainRules.waterMinMoisture;
}

/**
 * Check if a border-ring hex would be mountain/peak or water from its base fields.
 * Used by mountain and water tagging tileLookup closures — avoids re-sampling
 * border-ring hexes that aren't stored in the core tileMap.
 *
 * @param {number} q        - Global hex q
 * @param {number} r        - Global hex r
 * @param {Map}    fieldMap - Map<coordKey, sampleBaseFields result>
 * @returns {string|null} 'mountain', 'water', or null
 */
export function provisionalTerrainForRing(q, r, fieldMap) {
  const f = fieldMap.get(coordKey({ q, r }));
  if (!f) return null;
  const R = DEFAULT_TERRAIN_RULES;
  if (f.elevation > R.mountainThreshold) return 'mountain';
  if (isProvisionalWater(f.elevation, f.baseMoisture, R)) return 'water';
  return null;
}
