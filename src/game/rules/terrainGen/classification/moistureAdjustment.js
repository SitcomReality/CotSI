import { coordKey, hexesWithinRadius } from '../../../../engine/rules/hexGrid.js';
import { clamp01 } from '../fields/slopeComputation.js';

/**
 * Boost moisture for land tiles near water.
 *
 * Counts water neighbors within radius 2 via the provisionalWaterSet.
 * Each water neighbor adds 0.03 moisture — a coastal tile typically gets
 * +0.09 to +0.18, enough to push borderline-desert tiles into plains or forest.
 * Result is clamped to [0, 1].
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
  return clamp01(baseMoisture + waterNeighbors * 0.03);
}

/**
 * Rain shadow drying effect — stub, deferred to Phase G.
 *
 * A real rain shadow requires: prevailing wind direction, cross-wind
 * elevation gradient sampling, and a decay function. Returns 0 for now.
 *
 * @param {number}   _q           - Hex q coordinate
 * @param {number}   _r           - Hex r coordinate
 * @param {function} _elevationAt - (q, r) => elevation
 * @returns {number} 0
 */
export function computeRainShadow(_q, _r, _elevationAt) {
  return 0;  // deferred to Phase G
}
