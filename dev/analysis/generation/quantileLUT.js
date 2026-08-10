/**
 * quantileLUT.js — Quantile CDF lookup table builder and normalizer.
 *
 * Builds 256-entry quantile lookup tables from pooled histograms.
 * After quantile normalization via these LUTs, continuous fields are
 * uniform on [0, 1] — thresholds become true percentiles that survive
 * distribution changes when noise layers are added (Phases B, F).
 *
 * Pure: no DOM, no state, no side effects.
 */

/**
 * Pool multiple histograms (from different seeds/radii) into a single
 * ensemble histogram. Element-wise sum across all input histograms.
 *
 * @param {Uint32Array[]} histogramArray - Array of histograms to pool
 * @returns {Uint32Array} Pooled histogram (same bin count as input)
 */
export function poolHistograms(histogramArray) {
  if (histogramArray.length === 0) return new Uint32Array(50);
  const bins = histogramArray[0].length;

  const pooled = new Uint32Array(bins);
  for (const hist of histogramArray) {
    for (let i = 0; i < bins; i++) {
      pooled[i] += hist[i];
    }
  }
  return pooled;
}

/**
 * Build a quantile CDF lookup table from a pooled histogram.
 *
 * The LUT maps rawValue → percentile using the cumulative distribution.
 * With 256 entries, each entry i represents the percentile at raw value
 * i/255. Linear interpolation is used during normalization.
 *
 * The source histogram typically has 50 bins (from collectHistograms).
 * This function resamples to a 256-entry LUT by linearly interpolating
 * within the CDF.
 *
 * @param {Uint32Array} pooledHist     - Pooled histogram (from poolHistograms)
 * @param {number}      [binCount=256] - Number of LUT entries
 * @returns {Float32Array} LUT where lut[i] = percentile at raw value i/(binCount-1)
 *                         lut[0] = 0, lut[binCount-1] = 1.0
 */
export function buildQuantileLUT(pooledHist, binCount = 256) {
  const total = pooledHist.reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Degenerate: return identity LUT (no-op normalization)
    const lut = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) lut[i] = i / (binCount - 1);
    return lut;
  }

  const sourceBins = pooledHist.length;

  // Build CDF from source histogram (fractional cumulative per bin)
  const cdf = new Float32Array(sourceBins);
  let cumulative = 0;
  for (let i = 0; i < sourceBins; i++) {
    cumulative += pooledHist[i];
    cdf[i] = cumulative / total;
  }

  // Build the LUT: for each entry i (representing raw value i/(binCount-1)),
  // find the CDF value at that raw value via linear interpolation in CDF space.
  const lut = new Float32Array(binCount);

  for (let i = 0; i < binCount; i++) {
    const rawValue = i / (binCount - 1);

    // Map rawValue to the source bin it falls in
    const srcBinRaw = rawValue * sourceBins;
    const srcBin = Math.min(sourceBins - 1, Math.floor(srcBinRaw));
    const frac = srcBinRaw - srcBin;

    // CDF at the left edge of srcBin, linearly interpolating within the bin
    const lo = cdf[srcBin];
    const hi = srcBin < sourceBins - 1 ? cdf[srcBin + 1] : 1.0;

    lut[i] = lo + (hi - lo) * frac;
  }

  // Ensure clean endpoints
  lut[0] = 0;
  lut[binCount - 1] = 1.0;

  return lut;
}

/**
 * Normalize a raw field value through a quantile lookup table.
 *
 * Maps raw FBM output [0, 1] → uniform [0, 1] percentile space.
 * Uses linear interpolation between adjacent LUT entries for smooth results.
 *
 * @param {number}       rawValue - Raw field value in [0, 1]
 * @param {Float32Array} lut      - Quantile LUT from buildQuantileLUT
 * @returns {number} Percentile value in [0, 1]
 */
export function normalizeField(rawValue, lut) {
  const clamped = rawValue < 0 ? 0 : rawValue > 1 ? 1 : rawValue;

  // Find the bracketing LUT entries
  // LUT has binCount entries, where entry k covers raw value k / (binCount-1)
  const lutIndex = clamped * (lut.length - 1);
  const loIdx = Math.floor(lutIndex);
  const hiIdx = Math.min(loIdx + 1, lut.length - 1);
  const frac = lutIndex - loIdx;

  return lut[loIdx] + (lut[hiIdx] - lut[loIdx]) * frac;
}
