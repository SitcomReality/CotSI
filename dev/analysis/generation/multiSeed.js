/**
 * multiSeed.js — Batch map generation and aggregation across multiple seeds.
 *
 * Runs the full generation pipeline (terrain + entities) for each seed
 * and collects aggregate statistics. Uses setTimeout-based yielding to
 * keep the UI responsive during long batches.
 */
import { generateSingleSeed, DEFAULT_CHAMPIONS } from './generate.js';
import { coordKey } from '../../../src/engine/rules/hexGrid.js';
import { collectHistograms } from './histograms.js';
import {
  terrainDistribution,
  featureCounts,
  debrisCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
  traderRingHistogram,
  aggregateTerrainDistributions,
} from '../stats/stats.js';

/**
 * Collect all statistics for a single seed result.
 */
function collectSeedStats(result) {
  const { tiles, champions, mobs, traders, baseKeys } = result;
  return {
    terrain: terrainDistribution(tiles),
    features: featureCounts(tiles),
    debris: debrisCounts(tiles),
    mountains: mountainAnalysis(tiles),
    water: waterAnalysis(tiles),
    entities: entityStats(champions, mobs, traders),
    traderPositions: traderAnalysis(tiles, traders, baseKeys),
    traderRings: traderRingHistogram(traders),
  };
}

/**
 * Aggregate trader positions across all seeds into a heatmap.
 * Returns a Map of "q,r" -> count of seeds where a trader appeared there.
 */
function buildTraderHeatmap(perSeedStats) {
  const heatmap = new Map();
  for (const seed of perSeedStats) {
    if (!seed.traderPositions) continue;
    const seen = new Set(); // one count per seed per hex
    for (const tp of seed.traderPositions) {
      const key = coordKey(tp.pos);
      if (seen.has(key)) continue;
      seen.add(key);
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }
  }
  return heatmap;
}

/**
 * Aggregate entity positions (champion spawns) across seeds.
 */
function buildChampionHeatmap(perSeedStats) {
  const heatmap = new Map();
  for (const seed of perSeedStats) {
    if (!seed.championPositions) continue;
    for (const pos of seed.championPositions) {
      const key = coordKey(pos);
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }
  }
  return heatmap;
}

/**
 * Run multi-seed analysis.
 *
 * @param {object}   params
 * @param {string}   params.baseSeed   - Base seed text (e.g. "glut-17")
 * @param {number}   params.count      - Number of seeds to generate
 * @param {number}   params.radius     - Map radius
 * @param {object}   params.biomeDef   - Resolved biome archetype definition
 * @param {boolean}  params.multiBiome - Whether to use multi-biome generation
 * @param {function} params.onProgress - Called with (current, total) after each seed
 * @param {boolean}  [params.collectCalibration] - If true, collect histogram data per seed
 * @param {object}   [params.noiseConfig]        - Required when collectCalibration is true
 * @returns {Promise<object>} { perSeedStats, aggregate, traderHeatmap, championHeatmap, calibrationResults? }
 */
export async function runMultiSeed({ baseSeed, count, radius, biomeDef, multiBiome = false, onProgress, collectCalibration = false, noiseConfig = null }) {
  const perSeedStats = [];
  const terrainDistributions = [];
  const allChampionPositions = [];

  // ── Optional: calibration histogram arrays ──────────────────────
  let calibHists = null;
  if (collectCalibration && noiseConfig) {
    calibHists = { elev: [], moist: [], temp: [], slope: [] };
  }

  for (let i = 0; i < count; i++) {
    const seedText = `${baseSeed}-${i}`;
    const result = generateSingleSeed(seedText, radius, biomeDef, { multiBiome });
    const stats = collectSeedStats(result);

    // Collect champion positions for heatmap
    const champPositions = result.champions
      .filter(c => c.alive !== false)
      .map(c => ({ q: c.pos.q, r: c.pos.r }));
    stats.championPositions = champPositions;
    allChampionPositions.push(...champPositions);

    perSeedStats.push(stats);
    terrainDistributions.push(stats.terrain);

    // Collect calibration histogram for this seed
    if (calibHists) {
      const h = collectHistograms(seedText, radius, noiseConfig);
      calibHists.elev.push(h.elevHist);
      calibHists.moist.push(h.moistHist);
      calibHists.temp.push(h.tempHist);
      calibHists.slope.push(h.slopeHist);
    }

    if (onProgress) onProgress(i + 1, count);

    // Yield to the browser every 10 seeds to keep UI responsive
    if (i % 10 === 9 && i < count - 1) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const aggregate = {
    terrain: aggregateTerrainDistributions(terrainDistributions),
    seedCount: count,
    radius,
    baseSeed,
  };

  // ── Build calibration results from pooled histograms ────────────
  let calibrationResults = null;
  if (calibHists) {
    calibrationResults = {
      histograms: calibHists,  // { elev: U32Array[], moist: ..., temp: ..., slope: ... }
      seedCount: count,
      radius,
    };
  }

  return {
    perSeedStats,
    aggregate,
    traderHeatmap: buildTraderHeatmap(perSeedStats),
    championHeatmap: buildChampionHeatmap(perSeedStats),
    calibrationResults,
  };
}
