/**
 * frameThresholds.js — Frame-time thresholds, bucketing, and small shared
 * helpers for the performance report.
 *
 * Layer: dev/ — depends on performanceParams only.
 */

import { percentile } from '../stats.js';
import { TARGET_FPS, FRAME_GOOD_MARGIN_MS, FRAME_BAD_THRESHOLD_MS, FRAME_HITCH_THRESHOLD_MS, FRAME_MAJOR_HITCH_THRESHOLD_MS } from '../../../params/devtools/performanceParams.js';

export const TARGET_FRAME_MS = 1000 / TARGET_FPS; // 16.67
export const GOOD_THRESHOLD = TARGET_FRAME_MS + FRAME_GOOD_MARGIN_MS;   // ~18.7ms — still basically 60fps
export const BAD_THRESHOLD = FRAME_BAD_THRESHOLD_MS;                    // missed 30fps
export const HITCH_THRESHOLD = FRAME_HITCH_THRESHOLD_MS;                    // noticeable hitch
export const MAJOR_HITCH_THRESHOLD = FRAME_MAJOR_HITCH_THRESHOLD_MS;             // freeze territory

/**
 * Categorize a frame time into a human label.
 */
export function categorize(ms) {
  if (ms <= GOOD_THRESHOLD) return 'good';
  if (ms <= BAD_THRESHOLD) return 'missed60';
  if (ms <= HITCH_THRESHOLD) return 'bad';
  if (ms <= MAJOR_HITCH_THRESHOLD) return 'hitch';
  return 'majorHitch';
}

/**
 * Round to 1-decimal string for display, 2 decimals for tiny timings.
 */
export function round1(v) { return v.toFixed(1); }
export function round2(v) { return v.toFixed(2); }

/**
 * Build a context label from a FrameEntry's context field.
 */
export function contextLabel(entry) {
  const ctx = entry.context;
  if (!ctx) return 'unknown';
  let label = ctx.phase;
  if (ctx.championName) label += ` ${ctx.championName}`;
  if (ctx.action) label += ` (${ctx.action})`;
  if (ctx.detail && ctx.detail !== 'default') label += ` [${ctx.detail}]`;
  return label;
}

/**
 * Compute 1%-low and 0.1%-low FPS from a sorted frame-time array.
 * 1% low = 1 / (p99 frame time in seconds)
 * 0.1% low = 1 / (p99.9 frame time in seconds)
 */
export function computeLowFps(sortedFt) {
  if (sortedFt.length < 2) return { p1Low: 0, p01Low: 0 };
  const p99 = percentile(sortedFt, 99);
  const p999 = percentile(sortedFt, 99.9);
  return {
    p1Low: p99 > 0 ? 1000 / p99 : 0,
    p01Low: p999 > 0 ? 1000 / p999 : 0,
  };
}
