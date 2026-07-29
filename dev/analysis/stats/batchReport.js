/**
 * batchReport.js — Format batch analysis results for the stats panel.
 *
 * Pure formatting: takes structured result from batchRunner and returns
 * formatted text. No DOM, no state, no side effects.
 *
 * Delegates to existing formatters for individual sections:
 *   - formatSnapshotReport(), formatMultiSeedSeamReport(), formatClimateCoverageReport()
 *   - formatMultiStats(), formatCalibrationReport()
 *   - formatFrequencyReport(), formatMultiCalibrationReport()
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { formatSnapshotReport } from '../generation/snapshotTest.js';
import { formatMultiSeedSeamReport } from '../generation/seamTest.js';
import { formatClimateCoverageReport } from '../generation/climateCoverage.js';
import { formatFrequencyReport } from '../stats/calibrationDisplay.js';
import { formatCalibrationReport, exportCalibrationV1 } from '../generation/thresholdDerivation.js';
import { poolHistograms } from '../generation/quantileLUT.js';
import { percentileFromHistogram } from '../generation/histograms.js';
import { heatmapConcentration } from './stats.js';
import { getNoiseConfig, NOISE_FIELDS } from '../generation/noiseConfig.js';
import {
  DEFAULT_TERRAIN_RULES,
  SLOPE_NORMALIZATION,
  EPICENTER_GRID,
} from '../../../src/params/game/worldParams.js';

/** Total hexes in a radius-r map: 3r(r+1) + 1 */
function totalTilesAtRadius(r) {
  return 3 * r * (r + 1) + 1;
}

/**
 * Estimate passable tile count from an aggregateTerrainDistributions result.
 * Sums the mean percentages for all passable terrain types and multiplies
 * by total tile count for the radius.
 *
 * @param {object} terrainAgg - { terrainType: { mean: string, ... } }
 * @param {number} radius     - Map radius
 * @returns {number}
 */
function estimatePassableTiles(terrainAgg, radius) {
  const total = totalTilesAtRadius(radius);
  let passablePct = 0;
  for (const [terrain, d] of Object.entries(terrainAgg)) {
    const def = TERRAIN[terrain];
    if (def && def.passable) {
      passablePct += parseFloat(d.mean);
    }
  }
  return Math.round(total * passablePct / 100);
}

// ─── Noise-field labels for config display ──────────────────────────────────

const NOISE_FIELD_LABELS = {
  ELEVATION_DETAIL: 'Elevation detail',
  RIDGE:            'Ridge noise',
  MOISTURE:         'Moisture',
  TEMP_VARIATION:   'Temperature variation',
  REGION:           'Region bias',
};

/**
 * Format the active generation configuration as a self-documenting header.
 *
 * @param {number} seedCount      - Number of seeds used
 * @param {number[]} radii        - Map radii tested
 * @param {string} [baseSeed]     - Base seed text
 * @param {boolean} [multiBiome]  - Whether multi-biome was enabled
 * @returns {string}
 */
function formatConfigSection(seedCount, radii, baseSeed = 'glut-17', multiBiome = true) {
  const lines = [];
  lines.push('=== Active Configuration ===');
  lines.push(`Base seed: ${baseSeed}  |  Seeds: ${seedCount}  |  Radii: ${radii.join(', ')}  |  Multi-biome: ${multiBiome ? 'yes' : 'no'}`);
  lines.push('');

  // Per-radius noise config
  lines.push('Noise Config:');
  for (const radius of radii) {
    const nc = getNoiseConfig(radius);
    lines.push(`  Radius ${radius}:`);
    for (const field of NOISE_FIELDS) {
      const fk = field.key;
      const cfg = nc[fk];
      if (!cfg) continue;
      const label = (NOISE_FIELD_LABELS[fk] || fk).padEnd(22);
      const parts = [`octaves=${cfg.octaves}`, `freq=${cfg.frequency}`, `lacunarity=${cfg.lacunarity}`, `gain=${cfg.gain}`];
      if (cfg.offset !== undefined) parts.push(`offset=${cfg.offset}`);
      lines.push(`    ${label} ${parts.join('  ')}`);
    }
  }
  lines.push('');

  // Terrain rules
  lines.push('Terrain Rules (DEFAULT_TERRAIN_RULES):');
  const ruleLabels = {
    waterMaxElevation:        'waterMaxElevation',
    mountainThreshold:        'mountainThreshold',
    peakThreshold:            'peakThreshold',
    floatingIslandThreshold:  'floatingIslandThreshold',
    marshMaxElevation:        'marshMaxElevation',
    hillElevationMin:         'hillElevationMin',
    plateauSlopeMin:          'plateauSlopeMin',
    hillSlopeMin:             'hillSlopeMin',
    forestMinMoisture:        'forestMinMoisture',
    denseForestMinMoisture:   'denseForestMinMoisture',
    desertMaxMoisture:        'desertMaxMoisture',
    marshMinMoisture:         'marshMinMoisture',
    freezeTempMax:            'freezeTempMax',
    waterMinMoisture:         'waterMinMoisture',
  };
  for (const [key, label] of Object.entries(ruleLabels)) {
    const val = DEFAULT_TERRAIN_RULES[key];
    if (val !== undefined) {
      lines.push(`  ${label.padEnd(28)} ${val}`);
    }
  }
  lines.push('');

  lines.push(`Slope Normalization: ${SLOPE_NORMALIZATION}`);
  const eg = EPICENTER_GRID || {};
  lines.push(`Epicenter Grid: cellSize=${eg.cellSize}  jitterAmplitude=${eg.jitterAmplitude}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format the full batch analysis result as a single text report.
 *
 * @param {object} result - Output from batchRunner.runBatch()
 * @param {object} [opts] - Options describing what was collected; may include multiBiome
 * @returns {string} Formatted report
 */
export function formatBatchReport(result, opts = {}) {
  const { seedCount, radii, perRadius, calibration, snapshot, baseSeed } = result;
  const multiBiome = opts.multiBiome !== undefined ? opts.multiBiome : true;
  const parts = [];

  parts.push(`=== Batch Analysis Report ===`);
  parts.push('');

  // Active config header
  parts.push(formatConfigSection(seedCount, radii, baseSeed || 'glut-17', multiBiome));

  // ── Snapshot test (once, not per-radius) ─────────────────────────────
  if (snapshot) {
    parts.push(formatSnapshotReport(snapshot));
  }

  // ── Per-radius sections ────────────────────────────────────────────
  for (const radius of radii) {
    const rKey = String(radius);
    const rData = perRadius[rKey];
    if (!rData) continue;

    parts.push(`--- Radius ${radius} ---`);
    parts.push('');

    // Terrain distribution
    if (rData.terrain) {
      parts.push('Terrain distribution (mean % +/- stddev):');
      for (const [t, d] of Object.entries(rData.terrain)) {
        const label = (TERRAIN[t]?.label || t).padEnd(12);
        parts.push(`  ${label} ${d.mean.padStart(5)}%  +/-${d.stddev.padStart(5)}  (min ${d.min}%, max ${d.max}%)`);
      }
      parts.push('');
    }

    // Trader heatmap
    if (rData.traderHeatmap && rData.traderHeatmap.size > 0) {
      parts.push('Trader position heatmap (top 15 hexes by seed count):');
      const sorted = [...rData.traderHeatmap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      for (const [key, count] of sorted) {
        const pct = ((count / seedCount) * 100).toFixed(1);
        parts.push(`  ${key.padStart(8)}  ${count}/${seedCount}  (${pct}%)`);
      }
      // Concentration metrics
      if (rData.terrain) {
        const validTiles = estimatePassableTiles(rData.terrain, radius);
        const conc = heatmapConcentration(rData.traderHeatmap, seedCount, validTiles);
        parts.push(`  Concentration: Gini=${conc.gini}  unique=${conc.uniqueHexes}  expected=${conc.expectedUnique}  (${conc.note})`);
      }
      parts.push('');
    }

    // Champion heatmap
    if (rData.championHeatmap && rData.championHeatmap.size > 0) {
      parts.push('Champion spawn heatmap (top 15 hexes by seed count):');
      const sorted = [...rData.championHeatmap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      for (const [key, count] of sorted) {
        const pct = ((count / seedCount) * 100).toFixed(1);
        parts.push(`  ${key.padStart(8)}  ${count}/${seedCount}  (${pct}%)`);
      }
      // Concentration metrics (champions use passable tiles too)
      if (rData.terrain) {
        const validTiles = estimatePassableTiles(rData.terrain, radius);
        const conc = heatmapConcentration(rData.championHeatmap, seedCount, validTiles);
        parts.push(`  Concentration: Gini=${conc.gini}  unique=${conc.uniqueHexes}  expected=${conc.expectedUnique}  (${conc.note})`);
      }
      parts.push('');
    }

    // Pooled histograms per radius
    if (rData.histograms) {
      parts.push(`Pooled Histograms (${seedCount} seeds × r=${radius}):`);
      const fieldLabels = [
        { key: 'elev',  label: 'Elevation' },
        { key: 'moist', label: 'Moisture' },
        { key: 'temp',  label: 'Temperature' },
        { key: 'slope', label: 'Slope' },
      ];
      for (const f of fieldLabels) {
        const list = rData.histograms[f.key];
        if (!list || list.length === 0) {
          parts.push(`  ${f.label}: (no data)`);
          continue;
        }
        const pooled = poolHistograms(list);
        const p10 = percentileFromHistogram(pooled, 0.10);
        const p25 = percentileFromHistogram(pooled, 0.25);
        const p50 = percentileFromHistogram(pooled, 0.50);
        const p75 = percentileFromHistogram(pooled, 0.75);
        const p90 = percentileFromHistogram(pooled, 0.90);
        const p99 = percentileFromHistogram(pooled, 0.99);
        parts.push(`  ${f.label.padEnd(14)} p10=${p10.toFixed(3)}  p25=${p25.toFixed(3)}  p50=${p50.toFixed(3)}  p75=${p75.toFixed(3)}  p90=${p90.toFixed(3)}  p99=${p99.toFixed(3)}`);
      }

      // Land-only moisture row (excludes water and ice tiles)
      if (rData.tileHistsLand && rData.tileHistsLand.length > 0) {
        const moistList = rData.tileHistsLand.map(h => h.moistHist);
        const pooledMoistLand = poolHistograms(moistList);
        const lp10 = percentileFromHistogram(pooledMoistLand, 0.10);
        const lp25 = percentileFromHistogram(pooledMoistLand, 0.25);
        const lp50 = percentileFromHistogram(pooledMoistLand, 0.50);
        const lp75 = percentileFromHistogram(pooledMoistLand, 0.75);
        const lp90 = percentileFromHistogram(pooledMoistLand, 0.90);
        const lp99 = percentileFromHistogram(pooledMoistLand, 0.99);
        parts.push(`  Moisture (land)  p10=${lp10.toFixed(3)}  p25=${lp25.toFixed(3)}  p50=${lp50.toFixed(3)}  p75=${lp75.toFixed(3)}  p90=${lp90.toFixed(3)}  p99=${lp99.toFixed(3)}`);
      }

      parts.push('');
    }

    // Frequency verification
    if (rData.frequency) {
      // Format inline since frequency tests are per-radius
      const freq = rData.frequency;
      parts.push('Frequency Verification:');
      for (const r of Array.isArray(freq) ? freq : [freq]) {
        if (r.error) {
          parts.push(`  ${r.field || 'error'}: ${r.error}`);
          continue;
        }
        parts.push(`  ${r.field}:`);
        parts.push(`    config freq=${r.configFrequency}  octaves=${r.octaves}`);
        parts.push(`    target: ${r.target}`);
        parts.push(`    zero-crossings=${r.crossings}  half-cycles=${r.halfCycles}`);
        parts.push(`    effective λ=${r.effectiveWavelengthWorldUnits}wu  (~${r.effectiveWavelengthHexes} hexes)`);
        if (r.verdict) parts.push(`    verdict: ${r.verdict}`);
      }
      parts.push('');
    }

    // Tests
    if (rData.seam) {
      parts.push(formatMultiSeedSeamReport(rData.seam));
    }
    if (rData.climate) {
      parts.push(formatClimateCoverageReport(rData.climate));
    }

    // Spatial stats
    if (rData.spatial && rData.spatial.length > 0) {
      parts.push('Spatial Statistics (mean across seeds):');
      for (const s of rData.spatial) {
        parts.push(
          `  ${s.terrainType.padEnd(14)} patches=${s.componentCount}  ` +
          `singletons=${s.singletonCount}  ` +
          `mean=${s.meanSize}  med=${s.medianSize}  ` +
          `largest=${(s.largestPatchFraction * 100).toFixed(1)}%  ` +
          `gini=${s.gini}`
        );
      }
      parts.push('');
    }

    // Cross-field correlations
    if (rData.correlations && rData.correlations.length > 0) {
      parts.push('Cross-field Correlations (Pearson r, mean ± std across seeds):');
      for (const c of rData.correlations) {
        parts.push(
          `  ${c.fieldA.padEnd(18)} × ${c.fieldB.padEnd(18)}  r=${c.rMean}  ±${c.rStd}`
        );
      }
      parts.push('');
    }
  }

  // ── Cross-radius calibration ───────────────────────────────────────
  if (calibration) {
    parts.push(formatCalibrationReport(calibration));
  }

  return parts.join('\n');
}

/**
 * Create a JSON blob from the calibration portion of a batch result.
 *
 * @param {object} calibration - calibration object from runBatch()
 * @param {boolean} includeLUTs - Whether to include 4×256-entry LUT arrays
 * @returns {object} JSON-safe calibration document
 */
export function calibrationToJSON(calibration, includeLUTs) {
  if (!calibration) return null;
  return exportCalibrationV1(calibration, { includeLUTs });
}
