/**
 * aggregation.js — Multi-seed aggregation helpers.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';

/**
 * Combine multiple terrainDistribution results into mean and stddev.
 */
export function aggregateTerrainDistributions(distributions) {
  const terrains = Object.keys(TERRAIN);
  const result = {};

  for (const t of terrains) {
    const pcts = distributions.map(d => parseFloat((d.dist[t] || {}).pct || 0));
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const variance = pcts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / pcts.length;
    result[t] = {
      mean: mean.toFixed(1),
      stddev: Math.sqrt(variance).toFixed(2),
      min: Math.min(...pcts).toFixed(1),
      max: Math.max(...pcts).toFixed(1),
    };
  }

  return result;
}
