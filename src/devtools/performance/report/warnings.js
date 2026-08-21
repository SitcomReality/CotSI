/**
 * warnings.js — Warning generation for the performance report.
 *
 * Layer: dev/ — depends on frameThresholds.js and performanceParams.
 */

import {
  MEM_WARN_NEAR_LIMIT_RATIO, MEM_WARN_HIGH_AVG_RATIO, ALLOC_RATE_WARN_MB,
  JS_OVERHEAD_WARN_RATIO, JS_OVERHEAD_HIGH_WARN_RATIO, UNACCOUNTED_FRAME_WARN_PCT,
  VARIANCE_WARN_MIN_CALLS, VARIANCE_WARN_RATIO_MULTIPLIER,
} from '../../../params/devtools/performanceParams.js';
import { TARGET_FRAME_MS, BAD_THRESHOLD, HITCH_THRESHOLD, round1, round2 } from './frameThresholds.js';

/**
 * Generate the condensed warning list for a CaptureReport from its
 * already-computed analysis sections.
 *
 * @param {object} sections
 * @param {{ avg: number }|null} sections.ftStats
 * @param {Array<object>} sections.slowClusters
 * @param {{ totalSlow: number, hitch: number, majorHitch: number }} sections.longFrames
 * @param {{ maxHeap: number, avgHeap: number, limitMB: number|null }|null} sections.memStats
 * @param {{ avgMB: number, maxMB: number }|null} sections.heapDeltaStats
 * @param {{ invisibleRatio: number }|null} sections.jsOverhead
 * @param {{ pctUnaccounted: number }} sections.timeBudget
 * @param {Object<string, { frameCallCount: number, avgCall: number, max: number }>} sections.spanStats
 * @param {boolean} longTaskObserverActive
 * @returns {string[]}
 */
export function collectWarnings({ ftStats, slowClusters, longFrames, memStats, heapDeltaStats, jsOverhead, timeBudget, spanStats }, longTaskObserverActive) {
  const warnings = [];

  if (ftStats && ftStats.avg > HITCH_THRESHOLD) {
    warnings.push(`Average frame time ${round1(ftStats.avg)}ms exceeds ${HITCH_THRESHOLD}ms (sub-20fps)`);
  } else if (ftStats && ftStats.avg > BAD_THRESHOLD) {
    warnings.push(`Average frame time ${round1(ftStats.avg)}ms exceeds ${round1(BAD_THRESHOLD)}ms (sub-30fps)`);
  } else if (ftStats && ftStats.avg > TARGET_FRAME_MS) {
    warnings.push(`Average frame time ${round1(ftStats.avg)}ms exceeds ${round1(TARGET_FRAME_MS)}ms (sub-60fps)`);
  }

  if (slowClusters.length > 0) {
    warnings.push(`Found ${slowClusters.length} slow-frame clusters (${longFrames.totalSlow} frames >${round1(BAD_THRESHOLD)}ms)`);
  }

  if (memStats && memStats.limitMB != null && memStats.maxHeap > memStats.limitMB * MEM_WARN_NEAR_LIMIT_RATIO) {
    warnings.push(`Memory heap near limit: ${round1(memStats.maxHeap)}MB / ${round1(memStats.limitMB)}MB`);
  }
  if (memStats && memStats.limitMB != null && memStats.avgHeap > memStats.limitMB * MEM_WARN_HIGH_AVG_RATIO) {
    warnings.push(`Sustained high memory: avg ${round1(memStats.avgHeap)}MB / ${round1(memStats.limitMB)}MB`);
  }

  // Allocation-rate warning (only when heap delta data is available)
  if (heapDeltaStats && Math.abs(heapDeltaStats.avgMB) > ALLOC_RATE_WARN_MB) {
    warnings.push(
      `High allocation rate: avg ${round2(heapDeltaStats.avgMB)}MB/frame ` +
      `(max ${round2(heapDeltaStats.maxMB)}MB) — likely GC contributor`
    );
  }

  // JS overhead warning — invisible work inside the tick
  if (jsOverhead && jsOverhead.invisibleRatio > JS_OVERHEAD_WARN_RATIO) {
    const pct = round1(jsOverhead.invisibleRatio * 100);
    warnings.push(
      `${pct}% of JS tick time is invisible to instrumentation ` +
      `— likely GC or untimed code paths`
    );
  }
  if (jsOverhead && jsOverhead.invisibleRatio > JS_OVERHEAD_HIGH_WARN_RATIO && longFrames.hitch > 0) {
    const pct = round1(jsOverhead.invisibleRatio * 100);
    warnings.push(
      `${pct}% JS overhead + ${longFrames.hitch} hitches with Long Task API ` +
      `${longTaskObserverActive ? 'active' : 'unavailable'} — ` +
      `GC is the most likely common cause`
    );
  }

  if (timeBudget.pctUnaccounted > UNACCOUNTED_FRAME_WARN_PCT && longFrames.hitch > 0 && (ftStats != null)) {
    warnings.push(
      `${round1(timeBudget.pctUnaccounted)}% of frame time is unmeasured ` +
      `(${longFrames.hitch + longFrames.majorHitch} hitches >${round1(HITCH_THRESHOLD)}ms with little measured work)`
    );
  }

  // Warn when Long Task API was unavailable but hitches occurred
  if (longFrames.hitch > 0 && !longTaskObserverActive) {
    warnings.push(
      `Long Task API unavailable — hitches >${round1(HITCH_THRESHOLD)}ms may be GC, layout, or paint events ` +
      `invisible to JS instrumentation`
    );
  }

  // ── Variance-ratio warnings ──
  // Flag spans whose max call time is more than N x their average (≥ min calls),
  // which suggests intermittent bottlenecks rather than steady load.
  for (const [name, s] of Object.entries(spanStats)) {
    if (s.frameCallCount >= VARIANCE_WARN_MIN_CALLS && s.avgCall > 0 && s.max > s.avgCall * VARIANCE_WARN_RATIO_MULTIPLIER) {
      const ratio = (s.max / s.avgCall).toFixed(1);
      warnings.push(
        `${name}: max=${round1(s.max)}ms is ${ratio}x the average of ${round2(s.avgCall)}ms ` +
        `(possible intermittent bottleneck)`
      );
    }
  }

  return warnings;
}
