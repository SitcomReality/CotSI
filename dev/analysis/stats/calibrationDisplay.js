/**
 * calibrationDisplay.js — Format calibration tool output for the stats panel.
 *
 * Pure formatting functions. No DOM access, no side effects.
 * Each function takes data and returns a plain text string.
 */
import { NOISE_CONFIG, NOISE_FIELDS } from '../generation/noiseConfig.js';
import { normalizeField } from '../generation/quantileLUT.js';
import { percentileFromHistogram } from '../generation/histograms.js';

// ---------------------------------------------------------------------------
// Frequency Verification
// ---------------------------------------------------------------------------

/**
 * Format frequency verification results as a text report.
 *
 * @param {object[]} results - Output from verifyFrequency()
 * @returns {string}
 */
export function formatFrequencyReport(results) {
  const lines = [];
  lines.push('=== Frequency Verification ===');
  lines.push(`  radius=50  tiles=${results[0]?.totalTiles || 0}`);
  lines.push('');

  for (const r of results) {
    lines.push(`${r.field}:`);
    lines.push(`  config freq=${r.configFrequency}  octaves=${r.octaves}`);
    lines.push(`  target: ${r.target}`);
    lines.push(`  zero-crossings=${r.crossings}  half-cycles=${r.halfCycles}`);
    lines.push(`  effective λ=${r.effectiveWavelengthWorldUnits}wu  (~${r.effectiveWavelengthHexes} hexes)`);
    if (r.verdict) lines.push(`  verdict: ${r.verdict}`);
    lines.push('');
  }

  lines.push('--- hexToWorld note ---');
  lines.push('Adjacent hex spacing: ~1.0wu (q) / ~1.732wu (r)');
  lines.push('Wavelength = 1/f world-units. f=0.0008 → λ=1250wu.');
  lines.push('A radius-50 map spans ~100wu. At f=0.0008 that is ~0.08 cycles');
  lines.push('— far from the "2-4 landmasses" target. If zero-crossings confirm');
  lines.push('this, all frequencies need a downward revision.');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Histogram Report
// ---------------------------------------------------------------------------

/**
 * Format histogram collection results as a text report.
 *
 * @param {object} hists       - Output from collectHistograms()
 * @param {string} seedText    - Seed used
 * @param {number} radius      - Map radius
 * @returns {string}
 */
export function formatHistogramReport(hists, seedText, radius) {
  const lines = [];
  lines.push('=== Histogram Collection ===');
  lines.push(`  seed=${seedText}  radius=${radius}  tiles=${hists.tileCount}`);
  lines.push('');

  const fields = [
    { key: 'elevHist',  label: 'Elevation',   hist: hists.elevHist },
    { key: 'moistHist', label: 'Moisture',    hist: hists.moistHist },
    { key: 'tempHist',  label: 'Temperature', hist: hists.tempHist },
    { key: 'slopeHist', label: 'Slope',       hist: hists.slopeHist },
  ];

  for (const f of fields) {
    const p10  = percentileFromHistogram(f.hist, 0.10);
    const p25  = percentileFromHistogram(f.hist, 0.25);
    const p50  = percentileFromHistogram(f.hist, 0.50);
    const p75  = percentileFromHistogram(f.hist, 0.75);
    const p90  = percentileFromHistogram(f.hist, 0.90);
    const p95  = percentileFromHistogram(f.hist, 0.95);
    const p99  = percentileFromHistogram(f.hist, 0.99);

    lines.push(`${f.label}:`);
    lines.push(`  p10=${p10.toFixed(3)}  p25=${p25.toFixed(3)}  p50=${p50.toFixed(3)}`);
    lines.push(`  p75=${p75.toFixed(3)}  p90=${p90.toFixed(3)}  p95=${p95.toFixed(3)}  p99=${p99.toFixed(3)}`);
    lines.push('');
  }

  lines.push('--- Noted uses ---');
  lines.push('waterMaxElevation (p12)     → target ~0.12');
  lines.push('mountainThreshold (p90)     → top 10% elevation');
  lines.push('peakThreshold (p97)         → top 3% elevation');
  lines.push('floatingIsland (p99.5)      → top 0.5% elevation');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Quantile LUT Report
// ---------------------------------------------------------------------------

/**
 * Format quantile LUT build results as a text report.
 *
 * @param {object} result - { elevation, moisture, temperature, slope }
 *    Each field is a Float32Array LUT from buildQuantileLUT()
 * @param {string} sourceDesc - Description of what was pooled (e.g. "3 seeds × r=21")
 * @returns {string}
 */
export function formatQuantileReport(result, sourceDesc) {
  const lines = [];
  lines.push('=== Quantile LUT Build ===');
  lines.push(`  source: ${sourceDesc}`);
  lines.push('');

  const entries = [
    { key: 'elevation',    label: 'Elevation LUT' },
    { key: 'moisture',     label: 'Moisture LUT' },
    { key: 'temperature',  label: 'Temperature LUT' },
    { key: 'slope',        label: 'Slope LUT' },
  ];

  for (const e of entries) {
    const lut = result[e.key];
    if (!lut) continue;

    lines.push(`${e.label} (${lut.length} entries):`);

    // Sample a few entries
    const sampleIndices = [0, 32, 64, 96, 128, 160, 192, 224, 255];
    const sampleLine = sampleIndices.map(i =>
      `[${String(i).padStart(3)}]=${lut[i].toFixed(4)}`
    ).join('  ');
    lines.push(`  ${sampleLine}`);
    lines.push('');

    // Sanity: normalizeField at common percentiles
    const p50_norm = normalizeField(0.5, lut).toFixed(4);
    const p90_norm = normalizeField(0.90, lut).toFixed(4);
    const p10_norm = normalizeField(0.10, lut).toFixed(4);

    lines.push(`  sanity: raw=0.10→${p10_norm}  raw=0.50→${p50_norm}  raw=0.90→${p90_norm}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Full Calibration Run
// ---------------------------------------------------------------------------

/**
 * Format the combined output of a full "Run All" calibration sequence.
 *
 * @param {string} freqReport   - Output from formatFrequencyReport()
 * @param {string} histReport   - Output from formatHistogramReport()
 * @param {string} lutReport    - Output from formatQuantileReport()
 * @returns {string}
 */
export function formatCalibrationAll(freqReport, histReport, lutReport) {
  return freqReport + '\n' + histReport + '\n' + lutReport;
}
