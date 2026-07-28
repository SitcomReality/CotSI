import { neighbors } from '../../../../engine/rules/hexGrid.js';
import { SLOPE_NORMALIZATION } from '../../../../params/game/worldParams.js';

/**
 * Compute topographic slope from neighbor elevation deltas.
 *
 * @param {number}   q            - Hex q coordinate
 * @param {number}   r            - Hex r coordinate
 * @param {function} elevationAt  - (q, r) => elevation in [0, 1]
 * @returns {number} Slope in [0, 1], normalised by SLOPE_NORMALIZATION
 */
export function computeSlope(q, r, elevationAt) {
  const center = elevationAt(q, r);
  let totalDiff = 0;
  const nbrs = neighbors({ q, r });
  for (const n of nbrs) {
    totalDiff += Math.abs(elevationAt(n.q, n.r) - center);
  }
  return clamp01(totalDiff / (6 * SLOPE_NORMALIZATION));
}

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
