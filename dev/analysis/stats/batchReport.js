/**
 * batchReport.js — Format batch analysis results for the stats panel.
 *
 * Pure formatting: takes structured result from batchRunner and returns
 * formatted text. No DOM, no state, no side effects.
 *
 * Delegates to existing formatters for individual sections:
 *   - formatSnapshotReport(), formatMultiSeedSeamReport(), formatClimateCoverageReport()
 *   - formatCalibrationReport()
 *
 * Config and helpers in ./reportBaseFormat.js.
 * Heatmap formatting in ./reportHeatmapFormat.js.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { formatSnapshotReport } from '../generation/snapshotTest.js';
import { formatMultiSeedSeamReport } from '../generation/seamTestReport.js';
import { formatClimateCoverageReport } from '../generation/climateCoverage.js';
import { formatCalibrationReport, exportCalibrationV1 } from '../generation/calibrationExport.js';
import { poolHistograms } from '../generation/quantileLUT.js';
import { percentileFromHistogram } from '../generation/histograms.js';
import { formatConfigSection } from './reportBaseFormat.js';
import { formatHeatmapSection } from './reportHeatmapFormat.js';

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
  parts.push(`Generated: ${new Date().toISOString()}`);
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
      const heatmapParts = formatHeatmapSection(rData.traderHeatmap, seedCount, rData.terrain, radius, 'Trader position');
      parts.push(...heatmapParts);
      parts.push('');
    }

    // Champion heatmap
    if (rData.championHeatmap && rData.championHeatmap.size > 0) {
      const heatmapParts = formatHeatmapSection(rData.championHeatmap, seedCount, rData.terrain, radius, 'Champion spawn');
      parts.push(...heatmapParts);
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
