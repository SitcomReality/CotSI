/**
 * stats.js — Barrel: re-exports all stat-collection functions.
 *
 * Sub-modules:
 *   tileStats.js      — Per-tile distributions (biome, terrain, features, etc.)
 *   entityStats.js    — Entity statistics (champions, mobs, traders)
 *   aggregation.js    — Multi-seed aggregation helpers
 *   concentration.js  — Gini coefficient and heatmap concentration metrics
 */
export {
  biomeDistribution,
  terrainDistribution,
  featureCounts,
  mountainAnalysis,
  waterAnalysis,
} from './tileStats.js';

export {
  entityStats,
  traderAnalysis,
  traderRingHistogram,
} from './entityStats.js';

export {
  aggregateTerrainDistributions,
} from './aggregation.js';

export {
  giniCoefficient,
  passableTileCount,
  heatmapConcentration,
} from './concentration.js';
