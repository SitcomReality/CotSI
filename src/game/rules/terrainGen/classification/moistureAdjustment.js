import { coordKey, hexesWithinRadius } from '../../../../engine/rules/hexGrid.js';
import { clamp01 } from '../fields/slopeComputation.js';
import {
  WATER_MOISTURE_BOOST,
  RAIN_SHADOW_WIND,
  RAIN_SHADOW_DISTANCES,
  RAIN_SHADOW_ELEV_THRESHOLD,
  RAIN_SHADOW_DRYING,
} from '../../../../params/game/worldParams.js';

/**
 * Boost moisture for land tiles near water.
 *
 * Counts water neighbors within radius 2 via the provisionalWaterSet.
 * Each water neighbor adds WATER_MOISTURE_BOOST moisture — a coastal tile
 * typically gets +0.09 to +0.18, enough to push borderline-desert tiles
 * into plains or forest. Result is clamped to [0, 1].
 *
 * @param {number}     q                   - Hex q coordinate
 * @param {number}     r                   - Hex r coordinate
 * @param {number}     baseMoisture        - [0, 1] base moisture field value
 * @param {Map}        fieldMap            - Map<coordKey, sampleBaseFields result>
 * @param {Set<string>} provisionalWaterSet - Set<coordKey> of water-classified tiles
 * @returns {number} adjusted moisture [0, 1]
 */
export function adjustMoisture(q, r, baseMoisture, fieldMap, provisionalWaterSet) {
  let waterNeighbors = 0;
  for (const n of hexesWithinRadius(2)) {
    if (provisionalWaterSet.has(coordKey({ q: q + n.q, r: r + n.r }))) {
      waterNeighbors++;
    }
  }
  return clamp01(baseMoisture + waterNeighbors * WATER_MOISTURE_BOOST);
}

/**
 * Rain shadow drying effect (dev/futureWork.md §2).
 *
 * Samples elevation upwind of the tile (prevailing wind direction
 * RAIN_SHADOW_WIND at each distance in RAIN_SHADOW_DISTANCES). If the upwind
 * average rises at least RAIN_SHADOW_ELEV_THRESHOLD above the local
 * elevation, the intervening ridge blocks moisture and the tile dries by
 * (surplus - threshold) × RAIN_SHADOW_DRYING. A missing upwind hex defaults
 * to sea level, which never casts a shadow. Result is clamped to [0, 1].
 *
 * @param {number}   q           - Hex q coordinate
 * @param {number}   r           - Hex r coordinate
 * @param {function} elevationAt - (q, r) => elevation
 * @returns {number} drying amount in [0, 1]
 */
export function computeRainShadow(q, r, elevationAt) {
  let upwindTotal = 0;
  for (const distance of RAIN_SHADOW_DISTANCES) {
    upwindTotal += elevationAt(
      q + RAIN_SHADOW_WIND.dq * distance,
      r + RAIN_SHADOW_WIND.dr * distance
    );
  }
  const upwindAverage = upwindTotal / RAIN_SHADOW_DISTANCES.length;
  const elevationDiff = upwindAverage - elevationAt(q, r);
  if (elevationDiff < RAIN_SHADOW_ELEV_THRESHOLD) {
    return 0;
  }
  return clamp01((elevationDiff - RAIN_SHADOW_ELEV_THRESHOLD) * RAIN_SHADOW_DRYING);
}
