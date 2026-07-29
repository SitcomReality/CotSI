/**
 * batchRunner.js — Unified batch analysis orchestrator.
 *
 * Runs N seeds across M radii in a single pass, collecting only the data
 * the user selected. Progress is reported through a callback so the UI
 * can update a progress bar.
 *
 * Pure: no DOM, no state, no side effects (except via generator calls).
 */
import { generateSingleSeed } from '../generation/generate.js';
import { collectHistograms, collectTileHistograms } from '../generation/histograms.js';
import { verifyFrequency } from '../generation/frequencyVerification.js';
import { runSnapshotTests } from '../generation/snapshotTest.js';
import { runMultiSeedSeamTest } from '../generation/seamTest.js';
import { runClimateCoverageTest } from '../generation/climateCoverage.js';
import { getNoiseConfig, NOISE_CONFIG } from '../generation/noiseConfig.js';
import {
  collectRawSlopeDeltas,
  deriveThresholds,
} from '../generation/thresholdDerivation.js';
import {
  terrainDistribution,
  featureCounts,
  debrisCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
  aggregateTerrainDistributions,
} from '../stats/stats.js';
import { runSpatialStats, pearsonCorrelation } from '../stats/spatialStats.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';

// ─── Per-seed stats collector ────────────────────────────────────────────────

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
  };
}

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
    terrain:       options.terrain       ?? true,
    traderHeatmap: options.traderHeatmap ?? false,
    championHeatmap: options.championHeatmap ?? false,
    histograms:    options.histograms    ?? false,
    luts:          options.luts          ?? false,
    frequency:     options.frequency     ?? false,
    snapshot:      options.snapshot      ?? false,
    seam:          options.seam          ?? false,
    climate:       options.climate       ?? false,
    thresholds:    options.thresholds    ?? false,
    spatial:       options.spatial       ?? false,
    correlations:  options.correlations  ?? false,
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
  const allCalibHists = wants.histograms || wants.thresholds
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

    // Per-seed spatial stats accumulators
    const perSeedSpatial = wants.spatial ? [] : null;
    // Per-seed correlation accumulators
    const perSeedCorrElevTemp = wants.correlations ? [] : null;
    const perSeedCorrElevMoist = wants.correlations ? [] : null;
    const perSeedCorrMoistTemp = wants.correlations ? [] : null;

    // Per-seed tile-based histogram accumulators for this radius
    const radiusTileHistsAll = [];
    const radiusTileHistsLand = [];

    // Unused but may want in future:
    for (let i = 0; i < seedCount; i++) {
      const seedText = `${baseSeed}-${i}`;
      const detailText = `seed ${seedText} · r=${radius}`;
      onProgress(completedSteps, totalSteps, detailText);

      // ── 1. Generate full map (needed for terrain/trader) ──────────────
      const result = generateSingleSeed(seedText, radius, null, { multiBiome });
      const stats = collectSeedStats(result);

      // ── 1a. Collect tile-based histograms (actual field values) ──────
      radiusTileHistsAll.push(collectTileHistograms(result.tiles, { landOnly: false }));
      radiusTileHistsLand.push(collectTileHistograms(result.tiles, { landOnly: true }));

      // Accumulate terrain distributions
      terrainDists.push(stats.terrain);

      // Collect spatial stats per seed
      if (wants.spatial) {
        perSeedSpatial.push(runSpatialStats(result.tiles));
      }

      // Collect cross-field correlations per seed
      if (wants.correlations) {
        const tileArray = Object.values(result.tiles);
        perSeedCorrElevTemp.push(pearsonCorrelation(tileArray, 'elevationField', 'temperature').r);
        perSeedCorrElevMoist.push(pearsonCorrelation(tileArray, 'elevationField', 'moisture').r);
        perSeedCorrMoistTemp.push(pearsonCorrelation(tileArray, 'moisture', 'temperature').r);
      }

      // Accumulate trader positions for heatmap
      if (wants.traderHeatmap && stats.traderPositions.length > 0) {
        perSeedTraderPositions.push(
          ...stats.traderPositions.map(tp => tp.pos)
        );
      }

      // Accumulate champion positions for heatmap
      if (wants.championHeatmap && result.champions) {
        perSeedChampionPositions.push(
          ...result.champions
            .filter(c => c.alive !== false)
            .map(c => ({ q: c.pos.q, r: c.pos.r }))
        );
      }

      // ── 2. Collect histograms (needed for all calibration data) ────────
      if (wants.histograms) {
        const nc = getNoiseConfig(radius);
        const h = collectHistograms(seedText, radius, nc);
        radiusCalibHists.elev.push(h.elevHist);
        radiusCalibHists.moist.push(h.moistHist);
        radiusCalibHists.temp.push(h.tempHist);
        radiusCalibHists.slope.push(h.slopeHist);

        // Also accumulate cross-radius for threshold derivation
        allCalibHists.elev.push(h.elevHist);
        allCalibHists.moist.push(h.moistHist);
        allCalibHists.temp.push(h.tempHist);
        allCalibHists.slope.push(h.slopeHist);

        // Collect slope deltas for threshold normalization
        if (wants.thresholds) {
          const deltas = collectRawSlopeDeltas(seedText, radius, nc);
          for (let d = 0; d < deltas.length; d++) {
            allSlopeDeltas.push(deltas[d]);
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

    if (wants.terrain) {
      radiusResult.terrain = aggregateTerrainDistributions(terrainDists);
    } else {
      radiusResult.terrain = null;
    }

    // Trader heatmap from flat positions array
    if (wants.traderHeatmap && perSeedTraderPositions.length > 0) {
      const hm = new Map();
      for (const pos of perSeedTraderPositions) {
        const key = `${pos.q},${pos.r}`;
        hm.set(key, (hm.get(key) || 0) + 1);
      }
      radiusResult.traderHeatmap = hm;
    } else {
      radiusResult.traderHeatmap = null;
    }

    // Champion heatmap
    if (wants.championHeatmap && perSeedChampionPositions.length > 0) {
      const hm = new Map();
      for (const pos of perSeedChampionPositions) {
        const key = `${pos.q},${pos.r}`;
        hm.set(key, (hm.get(key) || 0) + 1);
      }
      radiusResult.championHeatmap = hm;
    } else {
      radiusResult.championHeatmap = null;
    }

    // ── 3b. Spatial stats aggregate ────────────────────────────────────
    if (wants.spatial && perSeedSpatial.length > 0) {
      // Collect per-terrain patch stats across seeds
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
        spatialAgg.push({
          terrainType: terrain,
          totalTiles: entries[0].totalTiles, // same across seeds at same radius
          componentCount: meanComp.toFixed(2),
          singletonCount: meanSingleton.toFixed(2),
          largestPatchFraction: meanLargestFrac.toFixed(4),
          gini: meanGini.toFixed(4),
        });
      }
      spatialAgg.sort((a, b) => b.totalTiles - a.totalTiles);
      radiusResult.spatial = spatialAgg;
    }

    // ── 3c. Correlation aggregate ──────────────────────────────────────
    if (wants.correlations && perSeedCorrElevTemp.length > 0) {
      const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const std = (arr, m) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
      const mt = mean(perSeedCorrElevTemp);
      const mm = mean(perSeedCorrElevMoist);
      const mtm = mean(perSeedCorrMoistTemp);
      radiusResult.correlations = [
        { fieldA: 'elevationField', fieldB: 'temperature',  rMean: mt.toFixed(4),  rStd: std(perSeedCorrElevTemp, mt).toFixed(4) },
        { fieldA: 'elevationField', fieldB: 'moisture',     rMean: mm.toFixed(4),  rStd: std(perSeedCorrElevMoist, mm).toFixed(4) },
        { fieldA: 'moisture',       fieldB: 'temperature',  rMean: mtm.toFixed(4), rStd: std(perSeedCorrMoistTemp, mtm).toFixed(4) },
      ];
    }

    // ── 4. Frequency verification (once per radius) ─────────────────────
    if (wants.frequency) {
      radiusResult.frequency = verifyFrequency(baseSeed, radius);
    }

    // ── 5. Tests (per radius) ─────────────────────────────────────────
    if (wants.seam) {
      // Run seam test across multiple seeds at this radius
      const seamSeeds = [];
      const numSeamSeeds = Math.min(seedCount, 5);
      for (let si = 0; si < numSeamSeeds; si++) {
        seamSeeds.push(`${baseSeed}-${si}`);
      }
      radiusResult.seam = runMultiSeedSeamTest(seamSeeds, radius);
    }
    if (wants.climate) {
      radiusResult.climate = runClimateCoverageTest(baseSeed, radius);
    }

    // ── 6. Per-radius histogram data (for reporting) ────────────────────
    if (wants.histograms) {
      radiusResult.histograms = radiusCalibHists
        ? { ...radiusCalibHists, seedCount, radius }
        : null;
    }

    // Tile-based histograms always collected (lightweight, used for land-only moisture)
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
    seedCount,
    radii,
    perRadius,
    calibration,
    snapshot,
  };
}

// ─── Simple fingerprint helper ───────────────────────────────────────────────

function fingerprint(nc) {
  let s = '';
  for (const [key, val] of Object.entries(nc)) {
    if (typeof val === 'object' && val !== null) {
      s += `${key}:${val.frequency}/${val.octaves}/${val.lacunarity}/${val.gain}|`;
    } else if (typeof val === 'number') {
      s += `${key}:${val.toString(16)}|`;
    }
  }
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
