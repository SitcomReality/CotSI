import { coordKey } from '../../../../engine/rules/hexGrid.js';
import { RIVER_SOURCE_FRACTION } from '../../../../params/game/worldParams.js';

/**
 * Deterministic Fisher-Yates shuffle using Murmur3-style mixing.
 * Produces the same permutation for the same seed and array contents.
 *
 * @param {object[]} array  - Array of tile objects to shuffle (unmodified)
 * @param {number}   seed   - Deterministic seed value
 * @returns {object[]} new shuffled array
 */
function seededShuffle(array, seed) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    let x = seed
      + Math.imul(i + 7, 374761393)
      + Math.imul(arr[i]?.q ?? 0, 668265263)
      + Math.imul(arr[i]?.r ?? 0, 362437);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    const j = ((x ^ (x >>> 16)) >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Select river source tiles from all generated tiles.
 * Filters by elevation and moisture thresholds, then deterministically
 * shuffles and takes a fraction of tiles.
 *
 * @param {object[]} tiles     - Array of tile objects with .q, .r, .elevationField, .baseMoisture
 * @param {Map}      fieldMap  - Map<coordKey, { elevation, baseMoisture }>
 * @param {object}   params    - { sourceMinElev, sourceMinMoist, seed }
 * @returns {object[]} selected source tile objects
 */
export function selectRiverSources(tiles, fieldMap, params) {
  const candidates = tiles.filter((tile) => {
    const key = coordKey(tile);
    const fields = fieldMap.get(key);
    return (
      fields &&
      fields.elevation > params.sourceMinElev &&
      fields.baseMoisture > params.sourceMinMoist
    );
  });

  const shuffled = seededShuffle(candidates, params.seed);
  const count = Math.max(1, Math.ceil(tiles.length * RIVER_SOURCE_FRACTION));

  return shuffled.slice(0, count);
}
