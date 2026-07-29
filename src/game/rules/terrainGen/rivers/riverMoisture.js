import { coordKey, hexesWithinRadius } from '../../../../engine/rules/hexGrid.js';
import { clamp01 } from '../fields/slopeComputation.js';
import { RIVER_MOISTURE_BOOST, RIVER_BOOST_RADIUS } from '../../../../params/game/worldParams.js';

/**
 * Apply moisture boost to all tiles near river paths.
 * Only mutates tile.moisture so the raw baseMoisture field is preserved
 * for invariant recomputation (seam test). The downstream terrain
 * re-classification in flatGeneration.js reads tile.moisture, not
 * tile.baseMoisture.
 *
 * @param {object[]} tiles       - Array of all tile objects
 * @param {object[][]} riverPaths - Array of river path arrays
 */
export function applyRiverMoistureBoost(tiles, riverPaths) {
  // Build a Set of river tile coordKeys from all paths
  const riverKeys = new Set();
  for (const path of riverPaths) {
    for (const tile of path) {
      riverKeys.add(coordKey({ q: tile.q, r: tile.r }));
    }
  }

  // Build a Set of all tiles within RIVER_BOOST_RADIUS of any river tile
  const offsets = hexesWithinRadius(RIVER_BOOST_RADIUS);
  const boostedKeys = new Set();
  for (const riverKey of riverKeys) {
    const [q, r] = riverKey.split(',').map(Number);
    for (const n of offsets) {
      boostedKeys.add(coordKey({ q: q + n.q, r: r + n.r }));
    }
  }

  // Create a tile lookup Map
  const tileByKey = new Map();
  for (const tile of tiles) {
    tileByKey.set(coordKey({ q: tile.q, r: tile.r }), tile);
  }

  // Apply moisture boost to each boosted tile
  for (const key of boostedKeys) {
    const tile = tileByKey.get(key);
    if (tile) {
      tile.moisture = clamp01(tile.moisture + RIVER_MOISTURE_BOOST);
    }
  }

  return boostedKeys;
}
