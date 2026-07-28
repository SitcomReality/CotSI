/**
 * batchReport.js — Format batch analysis results for the stats panel.
 *
 * Pure formatting: takes structured result from batchRunner and returns
 * formatted text. No DOM, no state, no side effects.
 *
 * Delegates to existing formatters for individual sections:
 *   - formatSnapshotReport(), formatSeamReport(), formatClimateCoverageReport()
 *   - formatMultiStats(), formatCalibrationReport()
 *   - formatFrequencyReport(), formatMultiCalibrationReport()
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { formatSnapshotReport } from '../generation/snapshotTest.js';
import { formatSeamReport } from '../generation/seamTest.js';
import { formatClimateCoverageReport } from '../generation/climateCoverage.js';
import { formatFrequencyReport } from '../stats/calibrationDisplay.js';
import { formatCalibrationReport, exportCalibrationV1 } from '../generation/thresholdDerivation.js';
import { poolHistograms } from '../generation/quantileLUT.js';
import { percentileFromHistogram } from '../generation/histograms.js';

/**
 * Format the full batch analysis result as a single text report.
 *
 * @param {object} result - Output from batchRunner.runBatch()
 * @param {object} [opts] - Options describing what was collected
 * @returns {string} Formatted report
 */
export function formatBatchReport(result, opts = {}) {
  const { seedCount, radii, perRadius, calibration } = result;
  const parts = [];

  parts.push(`=== Batch Analysis Report ===`);
  parts.push(`Seeds: ${seedCount}  |  Radii: ${radii.join(', ')}`);
  parts.push('');

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
    if (rData.snapshot) {
      parts.push(formatSnapshotReport(rData.snapshot));
    }
    if (rData.seam) {
      parts.push(formatSeamReport(rData.seam));
    }
    if (rData.climate) {
      parts.push(formatClimateCoverageReport(rData.climate));
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
