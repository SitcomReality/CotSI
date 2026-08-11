/**
 * concentration.js — Concentration metrics for heatmap analysis.
 *
 * Provides Gini coefficient, passable-tile counting, and heatmap
 * concentration analysis (expected unique vs observed unique).
 *
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';

/**
 * Compute the Gini coefficient for an array of non-negative values.
 *
 * 0 = perfectly equal distribution (all values identical).
 * 1 = maximally concentrated (one value holds all the mass).
 *
 * @param {number[]} values - Array of non-negative counts/values
 * @returns {number} Gini coefficient in [0, 1]
 */
export function giniCoefficient(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let cumulative = 0;
  let sumWeighted = 0;
  for (let i = 0; i < n; i++) {
    cumulative += sorted[i];
    sumWeighted += (i + 1) * sorted[i];
  }
  if (cumulative === 0) return 0;
  // Gini = (2 * sumWeighted) / (n * cumulative) - (n + 1) / n
  return (2 * sumWeighted) / (n * cumulative) - (n + 1) / n;
}

/**
 * Count passable tiles from a terrain distribution result.
 *
 * @param {{ dist: object, total: number }} terrainDist - Output of terrainDistribution()
 * @returns {number}
 */
export function passableTileCount(terrainDist) {
  let passable = 0;
  for (const [terrain, info] of Object.entries(terrainDist.dist)) {
    const def = TERRAIN[terrain];
    if (def && def.passable) {
      passable += info.count;
    }
  }
  return passable;
}

/**
 * Compute concentration metrics for a heatmap.
 *
 * Reports the Gini coefficient of the occupied-hex distribution, the number
 * of unique hexes ever occupied, and the expected unique hexes if placement
 * were uniform-random across valid tiles.
 *
 * @param {Map<string, number>} heatmap    - Map from "q,r" -> seed count
 * @param {number}              seedCount  - Total seeds in the batch
 * @param {number}              validTiles - Number of valid placement tiles
 * @returns {{ gini: string, uniqueHexes: number, expectedUnique: string, note: string }}
 */
export function heatmapConcentration(heatmap, seedCount, validTiles) {
  if (!heatmap || heatmap.size === 0 || seedCount === 0) {
    return { gini: 'N/A', uniqueHexes: 0, expectedUnique: 'N/A', note: 'No data' };
  }

  const counts = [...heatmap.values()];
  const uniqueHexes = heatmap.size;
  const gini = giniCoefficient(counts);

  // Expected unique hexes under uniform-random placement:
  // For each seed, P(avoid a specific hex) = 1 - 1/validTiles
  // Over M seeds: P(hex never occupied) = (1 - 1/validTiles)^M
  // Expected unique = validTiles * (1 - (1 - 1/validTiles)^M)
  const expectedUnique = validTiles > 0
    ? validTiles * (1 - Math.pow(1 - 1 / validTiles, seedCount))
    : 0;

  const ratio = expectedUnique > 0
    ? (uniqueHexes / expectedUnique).toFixed(2)
    : 'N/A';

  return {
    gini: gini.toFixed(4),
    uniqueHexes,
    expectedUnique: expectedUnique.toFixed(1),
    note: `obs/exp ratio: ${ratio}`,
  };
}
