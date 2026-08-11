/**
 * stats.js — Pure statistical math for performance analysis.
 *
 * Pure functions: percentile, summary stats, bucket computation, EMA.
 * No state, no imports.
 *
 * Layer: dev/ — leaf utility.
 */

import { EMA_ALPHA } from '../../params/devtools/performanceParams.js';

/**
 * Compute the p-th percentile from a sorted array (ascending).
 * Uses linear interpolation between adjacent values.
 * @param {number[]} sorted
 * @param {number} p — 0-100
 * @returns {number}
 */
export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * Compute summary statistics from an array of numbers.
 * @param {number[]} values
 * @returns {{ min: number, max: number, avg: number, median: number, p95: number, p99: number }|null}
 */
export function computeStats(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Compute frame-time bucket counts.
 * @param {number[]} frameTimes
 * @returns {{ under8: number, under16: number, under33: number, under50: number, over50: number }}
 */
export function bucketFrameTimes(frameTimes) {
  let under8 = 0, under16 = 0, under33 = 0, under50 = 0, over50 = 0;
  for (const t of frameTimes) {
    if (t <= 8) under8++;
    else if (t <= 16) under16++;
    else if (t <= 33) under33++;
    else if (t <= 50) under50++;
    else over50++;
  }
  return { under8, under16, under33, under50, over50 };
}

/**
 * Update an exponential moving average.
 * @param {number|null} prevEma — previous EMA value, or null on first call
 * @param {number} value — new measurement
 * @param {number} [alpha=0.3] — smoothing factor
 * @returns {number}
 */
export function computeEma(prevEma, value, alpha = EMA_ALPHA) {
  if (prevEma == null) return value;
  return prevEma * (1 - alpha) + value * alpha;
}
