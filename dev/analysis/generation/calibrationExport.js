/**
 * calibrationExport.js — Calibration export serialization and display formatting.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { normalizeField } from '../generation/quantileLUT.js';

/**
 * Create a JSON-serializable calibration export object.
 *
 * By default, quantile LUTs are excluded to keep the file compact (~50 lines
 * of thresholds + meta). Pass { includeLUTs: true } for the full dump.
 *
 * @param {object} calibrationResult - Output from the threshold-derivation pipeline (`deriveThresholds` in `generation/thresholdDerivation.js`)
 * @param {object} [opts]
 * @param {boolean} [opts.includeLUTs=false] - Include the 4×256-entry LUT arrays
 * @returns {object} JSON-safe calibration document
 */
export function exportCalibrationV1(calibrationResult, { includeLUTs = false } = {}) {
  const { quantileLUTs, thresholds, slopeNormalization, meta } = calibrationResult;

  const doc = {
    $schema: 'dev/mapgen_update/calibration_v1.schema.json',
    title: 'Phase 0 Calibration — Terrain Generation Redesign',
    description: 'Percentile thresholds derived from pooled histogram data. Thresholds remain valid through Phases B and F provided the LUTs are regenerated after each distribution change.',

    thresholds,
    slopeNormalization: {
      value: slopeNormalization,
      method: '95th percentile of per-tile average neighbor elevation deltas',
      description: 'Default divisor for slope computation: sum of 6 neighbor elevation deltas / this value → normalized slope [0, 1]',
    },

    meta: {
      ...meta,
      thresholdCount: Object.keys(thresholds).length,
      includedThresholds: Object.keys(thresholds),
    },
  };

  if (includeLUTs) {
    doc.quantileLUTs = quantileLUTs;
    doc.description += ' Includes quantile LUTs.';
  }

  return doc;
}

/**
 * Format calibration pipeline results as a text report for the stats panel.
 *
 * @param {object} result - Output from the threshold-derivation pipeline (`deriveThresholds` in `generation/thresholdDerivation.js`)
 * @returns {string}
 */
export function formatCalibrationReport(result) {
  const { quantileLUTs, thresholds, slopeNormalization, meta } = result;
  const lines = [];

  lines.push('=== Threshold Derivation ===');
  lines.push(`  ${meta.seedCount} seeds × radii [${meta.radii.join(', ')}]`);
  lines.push('');

  // ── Thresholds ────────────────────────────────────────────────────
  lines.push('Derived Thresholds (raw values at target percentiles):');
  lines.push('');

  const entries = [
    { label: 'waterMaxElevation',      key: 'waterMaxElevation',      color: '#5f9ac1' },
    { label: 'mountainThreshold',       key: 'mountainThreshold',       color: '#877c6a' },
    { label: 'plateauThreshold',        key: 'plateauThreshold',        color: '#9a9078' },
    { label: 'hillElevationMin',        key: 'hillElevationMin',        color: '#aaa' },
    { label: 'marshMaxElevation',       key: 'marshMaxElevation',       color: '#819967' },
    { label: 'forestMinMoisture',       key: 'forestMinMoisture',       color: '#4b8e41' },
    { label: 'denseForestMinMoisture',  key: 'denseForestMinMoisture',  color: '#2d6b23' },
    { label: 'desertMaxMoisture',       key: 'desertMaxMoisture',       color: '#d6b15b' },
    { label: 'marshMinMoisture',        key: 'marshMinMoisture',        color: '#819967' },
    { label: 'freezeTempMax',           key: 'freezeTempMax',           color: '#7ec8e3' },
  ];

  for (const e of entries) {
    const t = thresholds[e.key];
    if (!t) continue;
    lines.push(
      `  ${e.label.padEnd(28)} ${t.value.toFixed(4)}  (p${t.targetPercentile}, ${t.field})`
    );
  }

  lines.push('');
  lines.push(`Slope normalization:  ${slopeNormalization.toFixed(4)}  (95th percentile of per-tile avg deltas)`);
  lines.push('');

  // ── LUT sanity checks ─────────────────────────────────────────────
  lines.push('Quantile LUT sanity (raw → normalized):');
  const lutChecks = [
    { key: 'elevation',    label: 'Elevation' },
    { key: 'moisture',     label: 'Moisture' },
    { key: 'temperature',  label: 'Temperature' },
    { key: 'slope',        label: 'Slope' },
  ];

  for (const lc of lutChecks) {
    const lut = quantileLUTs[lc.key];
    if (!lut) continue;
    // Rebuild Float32Array for normalizeField
    const lutArray = new Float32Array(lut);
    const check10 = normalizeField(0.10, lutArray).toFixed(4);
    const check50 = normalizeField(0.50, lutArray).toFixed(4);
    const check90 = normalizeField(0.90, lutArray).toFixed(4);
    lines.push(`  ${lc.label.padEnd(14)} raw:0.10→${check10}  0.50→${check50}  0.90→${check90}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('Thresholds are raw values at the target percentile of the pooled');
  lines.push('distribution. They remain stable when Phases B/F change the composite.');
  lines.push('Only the quantile LUTs need regeneration after those phases.');
  lines.push('');

  return lines.join('\n');
}
