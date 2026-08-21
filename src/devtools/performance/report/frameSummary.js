/**
 * frameSummary.js — Overall frame/fps/memory summary and per-context
 * breakdown computation for the performance report.
 *
 * Layer: dev/ — depends on stats.js and frameThresholds.js.
 */

import { computeStats } from '../stats.js';
import { BAD_THRESHOLD, HITCH_THRESHOLD, categorize, computeLowFps } from './frameThresholds.js';

/**
 * Compute the overall summary block of a CaptureReport: frame-time and FPS
 * stats with bucket tallies, 1%/0.1% lows, memory and heap-delta stats, and
 * the derived long-frame counts.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} timeline
 */
export function computeOverallSummary(timeline) {
  const ftValues = timeline.map(e => e.frameTime).filter(v => v > 0);
  const fpsValues = timeline.map(e => e.fps).filter(v => v > 0);
  const fpsStats = computeStats(fpsValues);
  const ftStats = computeStats(ftValues);

  // Better bucket categories
  const ftBuckets = { good: 0, missed60: 0, bad: 0, hitch: 0, majorHitch: 0 };
  for (const v of ftValues) {
    ftBuckets[categorize(v)]++;
  }

  // 1% low / 0.1% low FPS
  const sortedFt = [...ftValues].sort((a, b) => a - b);
  const lowFps = computeLowFps(sortedFt);

  // Memory stats
  let memStats = null;
  const memValues = timeline
    .map(e => e.memory?.usedJSHeapSize)
    .filter(v => v != null && v > 0);
  if (memValues.length > 0) {
    const memMB = memValues.map(v => v / (1024 * 1024));
    const limitsMB = timeline
      .map(e => e.memory?.jsHeapSizeLimit)
      .filter(v => v != null && v > 0);
    memStats = {
      minHeap: Math.min(...memMB),
      maxHeap: Math.max(...memMB),
      avgHeap: memMB.reduce((s, v) => s + v, 0) / memMB.length,
      limitMB: limitsMB.length > 0 ? limitsMB[0] / (1024 * 1024) : null,
    };
  }

  // Heap delta (allocation rate) stats
  let heapDeltaStats = null;
  const heapDeltas = timeline
    .map(e => e.heapDelta)
    .filter(v => v != null && Number.isFinite(v));
  if (heapDeltas.length > 0) {
    const deltaBytes = computeStats(heapDeltas);
    if (deltaBytes) {
      heapDeltaStats = {
        avgBytes: deltaBytes.avg,
        maxBytes: deltaBytes.max,
        minBytes: deltaBytes.min,
        avgMB: deltaBytes.avg / (1024 * 1024),
        maxMB: deltaBytes.max / (1024 * 1024),
      };
    }
  }

  // Frame counts per category (report data) — derived from the bucket tally above
  const longFrames = {
    good: ftBuckets.good, missed60: ftBuckets.missed60, bad: ftBuckets.bad,
    hitch: ftBuckets.hitch, majorHitch: ftBuckets.majorHitch,
    totalSlow: ftBuckets.bad + ftBuckets.hitch + ftBuckets.majorHitch,
    totalMissed: ftBuckets.missed60 + ftBuckets.bad + ftBuckets.hitch + ftBuckets.majorHitch,
  };

  return { ftValues, fpsStats, ftStats, ftBuckets, lowFps, memStats, heapDeltaStats, longFrames };
}

/**
 * Compute the per-context (phase) breakdown and a simplified per-context
 * slow-frame summary.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} timeline
 * @returns {{ contextBreakdown: Object<string, object>, ctxSlowSummary: Object<string, { slow: number, hitches: number, worst: number }> }}
 */
export function computeContextBreakdown(timeline) {
  const frameTimesByPhase = {};
  const contextMeta = {};

  for (const entry of timeline) {
    if (entry.frameTime <= 0) continue;
    const phase = entry.context ? entry.context.phase : 'unknown';
    if (!frameTimesByPhase[phase]) {
      frameTimesByPhase[phase] = [];
      contextMeta[phase] = { count: 0, framesGt33: 0, framesGt50: 0 };
    }
    frameTimesByPhase[phase].push(entry.frameTime);
    contextMeta[phase].count++;
    if (entry.frameTime > HITCH_THRESHOLD) contextMeta[phase].framesGt50++;
    else if (entry.frameTime > BAD_THRESHOLD) contextMeta[phase].framesGt33++;
  }

  const contextBreakdown = {};
  for (const phase of Object.keys(frameTimesByPhase).sort()) {
    const stats = computeStats(frameTimesByPhase[phase]);
    if (stats) {
      contextBreakdown[phase] = {
        frames: contextMeta[phase].count,
        ...stats,
        framesGt33: contextMeta[phase].framesGt33,
        framesGt50: contextMeta[phase].framesGt50,
      };
    }
  }

  // Build a simplified per-context slow-frame summary
  const ctxSlowSummary = {};
  for (const [phase, meta] of Object.entries(contextMeta)) {
    const slowCount = meta.framesGt33 + meta.framesGt50;
    if (slowCount > 0) {
      ctxSlowSummary[phase] = {
        slow: slowCount,
        hitches: meta.framesGt50,
        worst: frameTimesByPhase[phase].length > 0
          ? Math.max(...frameTimesByPhase[phase]) : 0,
      };
    }
  }

  return { contextBreakdown, ctxSlowSummary };
}
