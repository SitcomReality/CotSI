/**
 * batchRunner.js — Unified batch analysis orchestrator.
 *
 * Runs N seeds across M radii in a single pass, coordinating per-seed
 * processing, per-radius aggregation, and cross-radius calibration.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { getNoiseConfig, NOISE_CONFIG } from '../generation/noiseConfig.js';
import {
  deriveThresholds,
} from '../generation/thresholdDerivation.js';
import { verifyFrequency } from '../generation/frequencyVerification.js';
import { runSnapshotTests } from '../generation/snapshotTest.js';
import { runMultiSeedSeamTest } from '../generation/seamTest.js';
import { runClimateCoverageTest } from '../generation/climateCoverage.js';
import { processSingleSeed } from './seedProcessor.js';
import {
  aggregateTerrain,
  buildHeatmap,
  aggregateSpatialStats,
  aggregateCorrelations,
} from './aggregators.js';
import { fingerprint } from './fingerprint.js';

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Run a batch analysis across seeds and radii.
 *
 * @param {object}   opts
 * @param {string}   opts.baseSeed     - Base seed text (e.g. "glut-17")
 * @param {number}   opts.seedCount    - Number of seeds per radius
 * @param {number[]} opts.radii        - Array of map radii (e.g. [21, 50])
 * @param {object}   opts.options      - Toggle object, see defaults below
 * @param {boolean}  opts.multiBiome   - Whether to use multi-biome mode (default true)
 * @param {function} opts.onProgress   - (current: number, total: number, detail: string) => void
 * @returns {Promise<object>} { seedCount, radii, perRadius, calibration }
 */
export async function runBatch(opts) {
  const {
    baseSeed = 'glut-17',
    seedCount = 50,
    radii = [21],
    options = {},
    multiBiome = true,
    onProgress = () => {},
  } = opts;

  const wants = {
    terrain:          options.terrain          ?? true,
    traderHeatmap:    options.traderHeatmap    ?? false,
    championHeatmap:  options.championHeatmap  ?? false,
    histograms:       options.histograms       ?? false,
    luts:             options.luts             ?? false,
    frequency:        options.frequency        ?? false,
    snapshot:         options.snapshot         ?? false,
    seam:             options.seam             ?? false,
    climate:          options.climate          ?? false,
    thresholds:       options.thresholds       ?? false,
    spatial:          options.spatial          ?? false,
    correlations:     options.correlations     ?? false,
  };

  // ── Derive implied toggles ─────────────────────────────────────────
  // LUTs and thresholds both need histogram data
  if (wants.luts) wants.histograms = true;
  if (wants.thresholds) wants.histograms = true;

  const totalSteps = seedCount * radii.length;
  let completedSteps = 0;

  // Per-radius result accumulator
  const perRadius = {};

  // Cross-radius calibration accumulators (if thresholds requested)
  const allCalibHists = (wants.histograms || wants.thresholds)
    ? { elev: [], moist: [], temp: [], slope: [] }
    : null;
  const allSlopeDeltas = wants.thresholds ? [] : null;

  // ── Loop: radii × seeds ────────────────────────────────────────────
  for (const radius of radii) {
    const radiusKey = String(radius);

    // Per-seed accumulators for this radius
    const terrainDists = [];
    const perSeedTraderPositions = [];
    const perSeedChampionPositions = [];
    const radiusCalibHists = wants.histograms
      ? { elev: [], moist: [], temp: [], slope: [] }
      : null;
    const perSeedSpatial = wants.spatial ? [] : null;
    const perSeedCorrElevTemp = wants.correlations ? [] : null;
    const perSeedCorrElevMoist = wants.correlations ? [] : null;
    const perSeedCorrMoistTemp = wants.correlations ? [] : null;
    const radiusTileHistsAll = [];
    const radiusTileHistsLand = [];

    for (let i = 0; i < seedCount; i++) {
      const seedText = `${baseSeed}-${i}`;
      const detailText = `seed ${seedText} · r=${radius}`;
      onProgress(completedSteps, totalSteps, detailText);

      // ── 1. Generate & collect per-seed data ────────────────────────────
      const data = processSingleSeed(seedText, radius, multiBiome, wants);
      const stats = data.stats;

      // Always-populated data
      radiusTileHistsAll.push(data.tileHistsAll);
      radiusTileHistsLand.push(data.tileHistsLand);
      terrainDists.push(stats.terrain);

      // Conditional accumulators
      if (wants.spatial && data.spatial) perSeedSpatial.push(data.spatial);
      if (wants.correlations) {
        perSeedCorrElevTemp.push(data.corrElevTemp);
        perSeedCorrElevMoist.push(data.corrElevMoist);
        perSeedCorrMoistTemp.push(data.corrMoistTemp);
      }
      if (wants.traderHeatmap && data.traderPositions) {
        perSeedTraderPositions.push(...data.traderPositions);
      }
      if (wants.championHeatmap && data.championPositions) {
        perSeedChampionPositions.push(...data.championPositions);
      }

      // ── 2. Accumulate calibration histograms ────────────────────────────
      if (wants.histograms && data.hists) {
        radiusCalibHists.elev.push(data.hists.elevHist);
        radiusCalibHists.moist.push(data.hists.moistHist);
        radiusCalibHists.temp.push(data.hists.tempHist);
        radiusCalibHists.slope.push(data.hists.slopeHist);

        // Cross-radius
        allCalibHists.elev.push(data.hists.elevHist);
        allCalibHists.moist.push(data.hists.moistHist);
        allCalibHists.temp.push(data.hists.tempHist);
        allCalibHists.slope.push(data.hists.slopeHist);

        if (wants.thresholds && data.slopeDeltas) {
          for (let d = 0; d < data.slopeDeltas.length; d++) {
            allSlopeDeltas.push(data.slopeDeltas[d]);
          }
        }
      }

      completedSteps++;

      // Yield to browser every 10 seeds per radius
      if (i % 10 === 9 && i < seedCount - 1) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // ── 3. Build per-radius aggregates ──────────────────────────────────
    const radiusResult = {};
    radiusResult.terrain = wants.terrain ? aggregateTerrain(terrainDists) : null;
    radiusResult.traderHeatmap = wants.traderHeatmap && perSeedTraderPositions.length > 0
      ? buildHeatmap(perSeedTraderPositions) : null;
    radiusResult.championHeatmap = wants.championHeatmap && perSeedChampionPositions.length > 0
      ? buildHeatmap(perSeedChampionPositions) : null;
    radiusResult.spatial = wants.spatial ? aggregateSpatialStats(perSeedSpatial) : null;
    radiusResult.correlations = wants.correlations
      ? aggregateCorrelations(perSeedCorrElevTemp, perSeedCorrElevMoist, perSeedCorrMoistTemp)
      : null;

    // ── 4. Frequency verification (once per radius) ─────────────────────
    radiusResult.frequency = wants.frequency ? verifyFrequency(baseSeed, radius) : null;

    // ── 5. Tests (per radius) ──────────────────────────────────────────
    if (wants.seam) {
      const numSeamSeeds = Math.min(seedCount, 5);
      const seamSeeds = [];
      for (let si = 0; si < numSeamSeeds; si++) {
        seamSeeds.push(`${baseSeed}-${si}`);
      }
      radiusResult.seam = runMultiSeedSeamTest(seamSeeds, radius);
    } else {
      radiusResult.seam = null;
    }

    radiusResult.climate = wants.climate ? runClimateCoverageTest(baseSeed, radius) : null;

    // ── 6. Per-radius histogram data ───────────────────────────────────
    radiusResult.histograms = wants.histograms && radiusCalibHists
      ? { ...radiusCalibHists, seedCount, radius }
      : null;

    // Tile-based histograms always collected (lightweight)
    radiusResult.tileHists = radiusTileHistsAll;
    radiusResult.tileHistsLand = radiusTileHistsLand;

    perRadius[radiusKey] = radiusResult;
  }

  // ── Snapshot test (once, not per-radius) ─────────────────────────────
  let snapshot = null;
  if (wants.snapshot) {
    snapshot = runSnapshotTests();
  }

  // ── Cross-radius threshold derivation ────────────────────────────────
  let calibration = null;
  if (wants.thresholds && allCalibHists && allCalibHists.elev.length > 0) {
    calibration = deriveThresholds(allCalibHists, allSlopeDeltas, {
      seedCount,
      radii,
      noiseConfigFingerprint: fingerprint(NOISE_CONFIG),
      dateGenerated: new Date().toISOString(),
    });
  }

  return {
    baseSeed,
    seedCount,
    radii,
    perRadius,
    calibration,
    snapshot,
  };
}
