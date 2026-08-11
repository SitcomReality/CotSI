/**
 * stats.js — Pure statistical math for performance analysis.
 *
 * Pure functions: percentile and summary stats.
 * No state, no imports.
 *
 * Layer: dev/ — leaf utility.
 */

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

