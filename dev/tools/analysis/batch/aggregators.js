/**
 * aggregators.js — Per-radius result aggregation for batch analysis.
 *
 * Each function takes per-seed data arrays collected within one radius
 * and produces the aggregate result object stored in perRadius[radiusKey].
 *
 * Pure: no DOM, no state, no side effects.
 */
import { aggregateTerrainDistributions } from '../stats/stats.js';

// ─── Terrain ─────────────────────────────────────────────────────────────────

/**
 * Aggregate per-seed terrain distributions into mean/std/min/max.
 *
 * @param {object[]} terrainDists - Array of terrainDistribution() results
 * @returns {object|null} aggregate object, or null if no data
 */
export function aggregateTerrain(terrainDists) {
  if (!terrainDists || terrainDists.length === 0) return null;
  return aggregateTerrainDistributions(terrainDists);
}

// ─── Heatmaps ────────────────────────────────────────────────────────────────

/**
 * Build a heatmap from an array of { q, r } positions across seeds.
 *
 * @param {{ q: number, r: number }[]} positions - Flat array of positions
 * @returns {Map<string, number>|null} Map of "q,r" → seed count, or null
 */
export function buildHeatmap(positions) {
  if (!positions || positions.length === 0) return null;
  const hm = new Map();
  for (const pos of positions) {
    const key = `${pos.q},${pos.r}`;
    hm.set(key, (hm.get(key) || 0) + 1);
  }
  return hm;
}

// ─── Spatial stats ──────────────────────────────────────────────────────────

/**
 * Aggregate per-seed spatial (patch) statistics into per-terrain means.
 *
 * @param {object[]} perSeedSpatial - Array of runSpatialStats() results
 * @returns {object[]|null} Sorted aggregated spatial stats, or null
 */
export function aggregateSpatialStats(perSeedSpatial) {
  if (!perSeedSpatial || perSeedSpatial.length === 0) return null;

  // Collect all terrain types present across seeds
  const terrainKeys = new Set();
  for (const seedSpatial of perSeedSpatial) {
    for (const t of seedSpatial) {
      terrainKeys.add(t.terrainType);
    }
  }

  const spatialAgg = [];
  for (const terrain of terrainKeys) {
    const entries = perSeedSpatial
      .map(s => s.find(t => t.terrainType === terrain))
      .filter(Boolean);
    if (entries.length === 0) continue;

    const meanComp = entries.reduce((a, b) => a + b.componentCount, 0) / entries.length;
    const meanSingleton = entries.reduce((a, b) => a + b.singletonCount, 0) / entries.length;
    const meanLargestFrac = entries.reduce((a, b) => a + parseFloat(b.largestPatchFraction), 0) / entries.length;
    const meanGini = entries.reduce((a, b) => a + parseFloat(b.gini), 0) / entries.length;
    const meanSize = entries.reduce((a, b) => a + parseFloat(b.meanSize), 0) / entries.length;
    const medianSize = entries.reduce((a, b) => a + parseFloat(b.medianSize), 0) / entries.length;
    spatialAgg.push({
      terrainType: terrain,
      totalTiles: entries[0].totalTiles, // same across seeds at same radius
      componentCount: meanComp.toFixed(2),
      singletonCount: meanSingleton.toFixed(2),
      largestPatchFraction: meanLargestFrac.toFixed(4),
      gini: meanGini.toFixed(4),
      meanSize: meanSize.toFixed(2),
      medianSize: medianSize.toFixed(1),
    });
  }

  spatialAgg.sort((a, b) => b.totalTiles - a.totalTiles);
  return spatialAgg;
}

// ─── Cross-field correlations ───────────────────────────────────────────────

/**
 * Aggregate per-seed Pearson correlations into mean ± std.
 *
 * @param {number[]} corrElevTemp  - Per-seed elevation×temperature r values
 * @param {number[]} corrElevMoist - Per-seed elevation×moisture r values
 * @param {number[]} corrMoistTemp - Per-seed moisture×temperature r values
 * @returns {object[]|null} Correlation summary array, or null
 */
export function aggregateCorrelations(corrElevTemp, corrElevMoist, corrMoistTemp) {
  if (!corrElevTemp || corrElevTemp.length === 0) return null;

  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);

  const mt = mean(corrElevTemp);
  const mm = mean(corrElevMoist);
  const mtm = mean(corrMoistTemp);

  return [
    { fieldA: 'elevationField', fieldB: 'temperature',  rMean: mt.toFixed(4),  rStd: std(corrElevTemp, mt).toFixed(4) },
    { fieldA: 'elevationField', fieldB: 'moisture',     rMean: mm.toFixed(4),  rStd: std(corrElevMoist, mm).toFixed(4) },
    { fieldA: 'moisture',       fieldB: 'temperature',  rMean: mtm.toFixed(4), rStd: std(corrMoistTemp, mtm).toFixed(4) },
  ];
}
