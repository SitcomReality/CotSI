/**
 * seedProcessor.js — Per-seed generation and data collection for batch analysis.
 *
 * Runs one seed through the full generation pipeline and collects every metric
 * the batch runner may need, gated by the `wants` toggle object.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { generateSingleSeed } from '../generation/generate.js';
import { collectHistograms, collectTileHistograms } from '../generation/histograms.js';
import { getNoiseConfig } from '../generation/noiseConfig.js';
import { collectRawSlopeDeltas } from '../generation/slopeDeltas.js';
import {
  terrainDistribution,
  featureCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
} from '../stats/stats.js';
import { runSpatialStats } from '../stats/spatialStats.js';
import { pearsonCorrelation } from '../stats/correlations.js';

// ─── Per-seed stats collector ────────────────────────────────────────────────

/**
 * Collect summary statistics from a single-generation result.
 *
 * @param {object} result - Output of generateSingleSeed()
 * @returns {object} Terrain, feature, mountain, water, entity, and trader stats
 */
export function collectSeedStats(result) {
  const { tiles, champions, mobs, traders, baseKeys } = result;
  return {
    terrain: terrainDistribution(tiles),
    features: featureCounts(tiles),
    mountains: mountainAnalysis(tiles),
    water: waterAnalysis(tiles),
    entities: entityStats(champions, mobs, traders),
    traderPositions: traderAnalysis(tiles, traders, baseKeys),
  };
}

// ─── Single-seed processing ─────────────────────────────────────────────────

/**
 * Generate one seed and collect all requested data.
 *
 * Always collects terrain/feature stats and tile-based histograms (lightweight).
 * Conditionally collects noise-field histograms, slope deltas, spatial stats,
 * cross-field correlations, trader positions, and champion positions based on
 * the `wants` toggle object.
 *
 * @param {string}  seedText    - Seed text (e.g. "glut-17-0")
 * @param {number}  radius      - Map radius in hexes
 * @param {boolean} multiBiome  - Whether to use multi-biome mode
 * @param {object}  wants       - Toggle object (same shape as batchRunner's wants)
 * @returns {object} Structured data bundle
 */
export function processSingleSeed(seedText, radius, multiBiome, wants) {
  // ── 1. Generate full map ──────────────────────────────────────────────────
  const result = generateSingleSeed(seedText, radius, null, { multiBiome });
  const stats = collectSeedStats(result);

  // Base data bundle — always populated
  const data = {
    result,
    stats,
    tileHistsAll: collectTileHistograms(result.tiles, { landOnly: false }),
    tileHistsLand: collectTileHistograms(result.tiles, { landOnly: true }),
  };

  // ── 2. Collect noise-field histograms (for calibration) ──────────────────
  if (wants.histograms) {
    const nc = getNoiseConfig(radius);
    const h = collectHistograms(seedText, radius, nc);
    data.hists = h;

    // Collect slope deltas for threshold normalization
    if (wants.thresholds) {
      data.slopeDeltas = collectRawSlopeDeltas(seedText, radius, nc);
    }
  }

  // ── 3. Spatial stats per seed ─────────────────────────────────────────────
  if (wants.spatial) {
    data.spatial = runSpatialStats(result.tiles);
  }

  // ── 4. Cross-field correlations per seed ──────────────────────────────────
  if (wants.correlations) {
    const tileArray = Object.values(result.tiles);
    data.corrElevTemp = pearsonCorrelation(tileArray, 'elevationField', 'temperature').r;
    data.corrElevMoist = pearsonCorrelation(tileArray, 'elevationField', 'moisture').r;
    data.corrMoistTemp = pearsonCorrelation(tileArray, 'moisture', 'temperature').r;
  }

  // ── 5. Trader positions for heatmap ──────────────────────────────────────
  if (wants.traderHeatmap && stats.traderPositions.length > 0) {
    data.traderPositions = stats.traderPositions.map(tp => tp.pos);
  }

  // ── 6. Champion positions for heatmap ─────────────────────────────────────
  if (wants.championHeatmap && result.champions) {
    data.championPositions = result.champions
      .filter(c => c.alive !== false)
      .map(c => ({ q: c.pos.q, r: c.pos.r }));
  }

  return data;
}
