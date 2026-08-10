/**
 * reportBuilder.js — Performance report analysis and formatting.
 *
 * Takes a set of per-frame entries recorded by frameProfiler and produces
 * a rich CaptureReport with overall stats, per-context breakdown, spike
 * clustering, time-budget analysis, and formatted output.
 *
 * Layer: dev/ — depends on stats.js and the FrameEntry type.
 */

import { TARGET_FPS, FRAME_GOOD_MARGIN_MS, FRAME_BAD_THRESHOLD_MS, FRAME_HITCH_THRESHOLD_MS, FRAME_MAJOR_HITCH_THRESHOLD_MS, CLUSTER_SKIP_TOLERANCE, CLUSTER_MIN_SIZE, WORST_FRAMES_COUNT, SPAN_FILTER_MIN_MS, MEM_WARN_NEAR_LIMIT_RATIO, MEM_WARN_HIGH_AVG_RATIO, ALLOC_RATE_WARN_MB, JS_OVERHEAD_WARN_RATIO, JS_OVERHEAD_HIGH_WARN_RATIO, UNACCOUNTED_FRAME_WARN_PCT, VARIANCE_WARN_MIN_CALLS, VARIANCE_WARN_RATIO_MULTIPLIER } from '../../params/dev/performanceParams.js';
import { computeStats, percentile } from './stats.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const TARGET_FRAME_MS = 1000 / TARGET_FPS; // 16.67
const GOOD_THRESHOLD = TARGET_FRAME_MS + FRAME_GOOD_MARGIN_MS;   // ~18.7ms — still basically 60fps
const BAD_THRESHOLD = FRAME_BAD_THRESHOLD_MS;                    // missed 30fps
const HITCH_THRESHOLD = FRAME_HITCH_THRESHOLD_MS;                    // noticeable hitch
const MAJOR_HITCH_THRESHOLD = FRAME_MAJOR_HITCH_THRESHOLD_MS;             // freeze territory

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Categorize a frame time into a human label.
 */
function _categorize(ms) {
  if (ms <= GOOD_THRESHOLD) return 'good';
  if (ms <= BAD_THRESHOLD) return 'missed60';
  if (ms <= HITCH_THRESHOLD) return 'bad';
  if (ms <= MAJOR_HITCH_THRESHOLD) return 'hitch';
  return 'majorHitch';
}

/**
 * Round to 1-decimal string for display, 2 decimals for tiny timings.
 */
function _r1(v) { return v.toFixed(1); }
function _r2(v) { return v.toFixed(2); }

/**
 * Build a context label from a FrameEntry's context field.
 */
function _contextLabel(entry) {
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
function _computeLowFps(sortedFt) {
  if (sortedFt.length < 2) return { p1Low: 0, p01Low: 0 };
  const p99 = percentile(sortedFt, 99);
  const p999 = percentile(sortedFt, 99.9);
  return {
    p1Low: p99 > 0 ? 1000 / p99 : 0,
    p01Low: p999 > 0 ? 1000 / p999 : 0,
  };
}

// ─── Slow-frame clustering ──────────────────────────────────────────────────

/**
 * Group adjacent slow frames into clusters. A cluster tolerates up to 2
 * consecutive non-slow frames before breaking.
 *
 * @param {FrameEntry[]} frames
 * @returns {Array<{ startIndex: number, endIndex: number, count: number,
 *   worstMs: number, worstEntry: FrameEntry, context: string,
 *   entries: FrameEntry[] }>}
 */
function _buildSlowClusters(frames) {
  const clusters = [];
  let current = null;

  for (let i = 0; i < frames.length; i++) {
    const entry = frames[i];
    const isSlow = entry.frameTime > BAD_THRESHOLD;

    if (isSlow) {
      if (!current) {
        current = { startTs: entry.timestamp, entries: [], skipCount: 0 };
      }
      current.entries.push(entry);
      current.skipCount = 0;
    } else if (current) {
      current.skipCount++;
      // Tolerate up to CLUSTER_SKIP_TOLERANCE non-slow frames between slow ones
      if (current.skipCount > CLUSTER_SKIP_TOLERANCE) {
        // Flush if the cluster has at least CLUSTER_MIN_SIZE slow frames
        if (current.entries.length >= CLUSTER_MIN_SIZE) {
          clusters.push(current);
        }
        current = null;
      }
    }
  }

  // Flush trailing cluster
  if (current && current.entries.length >= CLUSTER_MIN_SIZE) {
    clusters.push(current);
  }

  // Convert to summary form
  return clusters.map(c => {
    const worst = c.entries.reduce((a, b) => a.frameTime > b.frameTime ? a : b);
    return {
      startTs: c.startTs,
      endTs: c.entries[c.entries.length - 1].timestamp,
      count: c.entries.length,
      worstMs: worst.frameTime,
      worstEntry: worst,
      context: _contextLabel(worst),
      entries: c.entries,
    };
  });
}

// ─── Worst-frame drill-down ─────────────────────────────────────────────────

/**
 * Find the N worst frames by frameTime and return their span breakdown.
 * Used in the formatted report to show what caused the biggest spikes.
 *
 * @param {import('./frameProfiler.js').FrameEntry[]} frames
 * @param {number} [n=5]
 * @returns {Array<{ frameIndex: number, frameTime: number, context: string, spans: Array<{ name: string, ms: number, count: number }> }>}
 */
function _buildWorstFrames(frames, n = WORST_FRAMES_COUNT) {
  const indexed = frames
    .map((entry, i) => ({ index: i, entry }))
    .filter(({ entry }) => entry.frameTime > 0)
    .sort((a, b) => b.entry.frameTime - a.entry.frameTime)
    .slice(0, n);

  return indexed.map(({ index, entry }) => {
    // Collect non-trivial spans for this frame
    const spans = (entry.spans || [])
      .filter(s => s.ms > SPAN_FILTER_MIN_MS)
      .sort((a, b) => b.ms - a.ms);
    return {
      frameIndex: index,
      frameTime: entry.frameTime,
      context: entry.context
        ? `${entry.context.phase || 'unknown'}${entry.context.championName ? ' ' + entry.context.championName : ''}${entry.context.action ? ' (' + entry.context.action + ')' : ''}`
        : 'unknown',
      spans,
    };
  });
}

// ─── Per-interval span aggregation ──────────────────────────────────────────

/**
 * Aggregate per-frame span data across the timeline.
 * Uses the new `spans` array on each frame entry.
 */
function _aggregateSpans(frames) {
  const spanByName = {};

  for (const entry of frames) {
    if (!entry.spans) continue;
    for (const span of entry.spans) {
      if (!spanByName[span.name]) {
        spanByName[span.name] = { totalMs: 0, totalCount: 0, callCount: 0, durations: [] };
      }
      const acc = spanByName[span.name];
      acc.totalMs += span.ms;
      acc.totalCount += span.count;
      acc.callCount++;
      acc.durations.push(span.ms);
    }
  }

  const results = {};
  for (const [name, acc] of Object.entries(spanByName)) {
    const stats = computeStats(acc.durations);
    results[name] = {
      totalMs: acc.totalMs,
      totalCount: acc.totalCount,
      frameCallCount: acc.callCount,
      avgCall: acc.callCount > 0 ? acc.totalMs / acc.callCount : 0,
      min: stats ? stats.min : 0,
      max: stats ? stats.max : 0,
      median: stats ? stats.median : 0,
      p95: stats ? stats.p95 : 0,
    };
  }

  return results;
}

// ─── Exclusive span time computation ───────────────────────────────────────

/**
 * Detect parent-child nesting among spans and compute exclusive (self) time
 * for each. Uses two strategies:
 *
 * 1. Naming convention: if span "foo" and span "foo:bar" share the same
 *    frameCallCount, "foo:bar" is a child of "foo".
 * 2. Known-parents table: explicit relationships not covered by naming
 *    (e.g., refreshAll → mapRefresh).
 *
 * @param {Object<string, { totalMs: number, frameCallCount: number }>} spanStats
 * @returns {Object<string, { exclusiveMs: number, childNames: string[] }>}
 */
function _computeExclusiveSpanTimes(spanStats) {
  // Known parent-child relationships not covered by naming convention
  const _KNOWN_PARENTS = {
    'refreshAll': ['mapRefresh', 'dom:header', 'dom:leftPanel', 'dom:rightPanel'],
    'mapRefresh': ['renderHexMap'],
    'renderHexMap': ['mesh:chunks', 'mesh:units'],
  };

  // Initialise every span as its own exclusive leaf
  /** @type {Object<string, { childNames: string[], exclusiveMs: number }>} */
  const exclusive = {};
  for (const name of Object.keys(spanStats)) {
    exclusive[name] = { childNames: [], exclusiveMs: spanStats[name].totalMs };
  }

  // Phase 1: naming convention — 'overlays' / 'overlay:fogOverlay'
  for (const [name, s] of Object.entries(spanStats)) {
    const prefix = name + ':';
    if (name.includes(':')) continue; // children never become parents via naming

    for (const [childName, cs] of Object.entries(spanStats)) {
      if (
        childName !== name &&
        childName.startsWith(prefix) &&
        s.frameCallCount === cs.frameCallCount
      ) {
        exclusive[name].childNames.push(childName);
      }
    }
  }

  // Phase 2: known-parents table
  for (const [parent, children] of Object.entries(_KNOWN_PARENTS)) {
    if (!spanStats[parent]) continue;
    for (const child of children) {
      if (
        spanStats[child] &&
        !exclusive[parent].childNames.includes(child)
      ) {
        exclusive[parent].childNames.push(child);
      }
    }
  }

  // Compute exclusive times bottom-up (children before parents).
  // A depth-first post-order walk ensures that when we subtract a child's
  // inclusive total, the child's own children have already been subtracted.
  const visited = new Set();

  function computeExclusive(name) {
    if (visited.has(name)) return exclusive[name].exclusiveMs;
    if (exclusive[name].childNames.length === 0) return exclusive[name].exclusiveMs;

    visited.add(name);
    let childrenTotal = 0;
    for (const cname of exclusive[name].childNames) {
      if (!spanStats[cname]) continue;
      const childExcl = computeExclusive(cname);
      // The child's inclusive total is what the parent includes.
      // We use the parent's raw total minus children's raw totals so that
      // children who are themselves parents have already had their own
      // children subtracted.
      childrenTotal += spanStats[cname].totalMs;
    }
    exclusive[name].exclusiveMs = Math.max(0, spanStats[name].totalMs - childrenTotal);
    return exclusive[name].exclusiveMs;
  }

  for (const name of Object.keys(exclusive)) {
    computeExclusive(name);
  }

  return exclusive;
}

// ─── JS invisible-overhead computation ─────────────────────────────────────

/**
 * Compute the proportion of JS tick time that is not accounted for by any
 * named measurement. Uses frameJs (total tick time) vs the sum of exclusive
 * times of every other per-frame measurement.
 *
 * @param {Object<string, { totalMs: number, frameCallCount: number }>} spanStats
 * @param {Object<string, { exclusiveMs: number }>} exclusiveTimes
 * @returns {{ frameJsTotalMs: number, frameJsCalls: number,
 *   frameJsAvgPerFrame: number, measuredAvgPerFrame: number,
 *   invisibleAvgPerFrame: number, invisibleRatio: number }|null}
 */
function _computeJsOverhead(spanStats, exclusiveTimes) {
  const frameJs = spanStats['frameJs'];
  if (!frameJs || frameJs.frameCallCount === 0) return null;

  const tickCallCount = frameJs.frameCallCount;
  let totalMeasured = 0;

  // Sum exclusive times of all spans that run on every tick (same call count
  // as frameJs). This avoids double-counting and only includes work that
  // happens inside the tick.
  for (const [name, s] of Object.entries(spanStats)) {
    if (name === 'frameJs') continue;
    if (s.frameCallCount === tickCallCount) {
      const excl = exclusiveTimes[name];
      if (excl) totalMeasured += excl.exclusiveMs;
    }
  }

  // recordFrame is meta-overhead that lands inside the tick but after frameJs
  // is captured — don't count it in measured work.
  if (exclusiveTimes['recordFrame']) {
    totalMeasured -= exclusiveTimes['recordFrame'].exclusiveMs;
  }

  const frameJsAvg = frameJs.totalMs / frameJs.frameCallCount;
  const measuredAvg = totalMeasured / tickCallCount;
  const invisibleAvg = Math.max(0, frameJsAvg - measuredAvg);
  const invisibleRatio = frameJsAvg > 0 ? invisibleAvg / frameJsAvg : 0;

  return {
    frameJsTotalMs: frameJs.totalMs,
    frameJsCalls: frameJs.frameCallCount,
    frameJsAvgPerFrame: frameJsAvg,
    measuredAvgPerFrame: measuredAvg,
    invisibleAvgPerFrame: invisibleAvg,
    invisibleRatio,
  };
}

// ─── Time budget (from spans) ───────────────────────────────────────────────

/**
 * Compute per-frame time budget from per-frame measurement deltas.
 * Uses exclusive (self) times to avoid double-counting nested spans.
 *
 * @param {FrameEntry[]} frames
 * @param {number} avgFrameMs
 * @returns {{ items: Array<{ name: string, totalMs: number, exclusiveMs: number,
 *   perFrameMs: number, pctOfFrame: number, callCount: number,
 *   avgCall: number, maxCall: number }>, hasNesting: boolean,
 *   totalMeasuredMs: number, perFrameMeasuredMs: number,
 *   perFrameUnaccountedMs: number, pctUnaccounted: number }}
 */
function _computeTimeBudgetFromSpans(frames, avgFrameMs) {
  const spanAgg = _aggregateSpans(frames);
  const exclusiveTimes = _computeExclusiveSpanTimes(spanAgg);

  const items = [];
  let totalMeasured = 0;
  let hasNesting = false;

  // Exclude meta-spans that overlap with per-frame measurements
  // or are profiler overhead rather than game work.
  const _metaSpans = ['frameJs', 'recordFrame', 'frame:tick'];
  for (const [name, s] of Object.entries(spanAgg)) {
    if (_metaSpans.includes(name)) continue;
    const excl = exclusiveTimes[name];
    if (!excl) continue;

    if (excl.childNames.length > 0) hasNesting = true;
    totalMeasured += excl.exclusiveMs;
    const perFrameMs = frames.length > 0 ? excl.exclusiveMs / frames.length : 0;
    const pctOfFrame = avgFrameMs > 0 ? (perFrameMs / avgFrameMs) * 100 : 0;
    items.push({
      name,
      totalMs: s.totalMs,
      exclusiveMs: excl.exclusiveMs,
      perFrameMs,
      pctOfFrame,
      callCount: s.frameCallCount,
      avgCall: s.avgCall,
      maxCall: s.max,
    });
  }

  items.sort((a, b) => b.perFrameMs - a.perFrameMs);

  const perFrameMeasured = frames.length > 0 ? totalMeasured / frames.length : 0;
  const perFrameUnaccounted = Math.max(0, avgFrameMs - perFrameMeasured);

  return {
    items,
    hasNesting,
    totalMeasuredMs: totalMeasured,
    perFrameMeasuredMs: perFrameMeasured,
    perFrameUnaccountedMs: perFrameUnaccounted,
    pctUnaccounted: avgFrameMs > 0 ? (perFrameUnaccounted / avgFrameMs) * 100 : 0,
  };
}

// ─── Per-phase time budget ───────────────────────────────────────────────

/**
 * Compute time budget broken down by game phase (context.phase).
 * Groups frames by phase, then computes the per-phase budget the same
 * way _computeTimeBudgetFromSpans works for the aggregate.
 *
 * @param {FrameEntry[]} frames
 * @returns {Array<{ phase: string, frameCount: number, avgFrameMs: number,
 *   pctUnaccounted: number, perFrameUnaccountedMs: number }>}
 */
function _computeTimeBudgetByPhase(frames) {
  const byPhase = {};
  for (const entry of frames) {
    const phase = entry.context?.phase || 'unknown';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(entry);
  }

  const results = [];
  for (const [phase, phaseFrames] of Object.entries(byPhase)) {
    const ftValues = phaseFrames.map(e => e.frameTime).filter(v => v > 0);
    if (ftValues.length === 0) continue;
    const avgMs = ftValues.reduce((s, v) => s + v, 0) / ftValues.length;
    const budget = _computeTimeBudgetFromSpans(phaseFrames, avgMs);
    results.push({
      phase,
      frameCount: phaseFrames.length,
      avgFrameMs: avgMs,
      pctUnaccounted: budget.pctUnaccounted,
      perFrameUnaccountedMs: budget.perFrameUnaccountedMs,
    });
  }

  // Sort by unaccounted percentage descending
  results.sort((a, b) => b.pctUnaccounted - a.pctUnaccounted);
  return results;
}

// ─── Report builder ────────────────────────────────────────────────────────

/**
 * Build a complete CaptureReport from recorded frame entries.
 *
 * @param {FrameEntry[]} frames — ordered array of per-frame entries
 * @param {{ start: number, end: number, durationMs: number, pollCount: number }} interval
 * @param {Array<{ startTime: number, duration: number, name: string }>} [longTasks]
 * @returns {CaptureReport}
 */
export function buildReport(frames, interval, longTasks = []) {
  const timeline = frames;
  const { start, end, durationMs, pollCount, longTaskObserverActive } = interval;
  const frameCount = timeline.length;

  // ── 1. Overall frame stats ──────────────────────────────────────────────
  const ftValues = timeline.map(e => e.frameTime).filter(v => v > 0);
  const fpsValues = timeline.map(e => e.fps).filter(v => v > 0);
  const fpsStats = computeStats(fpsValues);
  const ftStats = computeStats(ftValues);

  // Better bucket categories
  const ftBuckets = { good: 0, missed60: 0, bad: 0, hitch: 0, majorHitch: 0 };
  for (const v of ftValues) {
    ftBuckets[_categorize(v)]++;
  }

  // 1% low / 0.1% low FPS
  const sortedFt = [...ftValues].sort((a, b) => a - b);
  const lowFps = _computeLowFps(sortedFt);

  // ── 2. Memory stats ─────────────────────────────────────────────────────
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

  // ── 2b. Heap delta (allocation rate) stats ─────────────────────────────
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

  // ── 3. Slow-frame clusters ─────────────────────────────────────────────
  const slowClusters = _buildSlowClusters(timeline);

  // Individual spike entries (for the report data, not the formatted output)
  let thGood = 0, thMissed = 0, thBad = 0, thHitch = 0, thMajor = 0;
  for (const v of ftValues) {
    const cat = _categorize(v);
    if (cat === 'good') thGood++;
    else if (cat === 'missed60') thMissed++;
    else if (cat === 'bad') thBad++;
    else if (cat === 'hitch') thHitch++;
    else if (cat === 'majorHitch') thMajor++;
  }

  const longFrames = {
    good: thGood, missed60: thMissed, bad: thBad,
    hitch: thHitch, majorHitch: thMajor,
    totalSlow: thBad + thHitch + thMajor,
    totalMissed: thMissed + thBad + thHitch + thMajor,
  };

  // ── 4. Per-context breakdown ────────────────────────────────────────────
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
    if (entry.frameTime > 50) contextMeta[phase].framesGt50++;
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

  // ── 5. Per-measurement span stats ───────────────────────────────────────
  const spanStats = _aggregateSpans(timeline);
  const exclusiveTimes = _computeExclusiveSpanTimes(spanStats);
  const jsOverhead = _computeJsOverhead(spanStats, exclusiveTimes);

  // Also keep the old cumulative measurement snapshots for compatibility
  const measByName = {};
  for (const entry of timeline) {
    for (const [name, m] of Object.entries(entry.measurements)) {
      if (!measByName[name]) measByName[name] = [];
      measByName[name].push(m);
    }
  }

  const measurements = {};
  for (const [name, entries] of Object.entries(measByName)) {
    const emas = entries.map(e => e.ema).filter(v => v > 0);
    const avgs = entries.map(e => e.avg).filter(v => v > 0);
    const totals = entries.map(e => e.total);
    const counts = entries.map(e => e.count);

    if (avgs.length === 0) continue;

    const avgStats = computeStats(avgs);
    if (!avgStats) continue;

    const count = Math.max(...counts);
    const total = Math.max(...totals);
    const firstEma = emas.length > 0 ? emas[0] : null;
    const lastEma = emas.length > 0 ? emas[emas.length - 1] : null;
    const trendPct = (firstEma != null && lastEma != null && firstEma > 0)
      ? ((lastEma - firstEma) / firstEma) * 100
      : null;

    measurements[name] = {
      min: avgStats.min,
      max: avgStats.max,
      avg: avgStats.avg,
      median: avgStats.median,
      p95: avgStats.p95,
      p99: avgStats.p99,
      count,
      total,
      firstEma,
      lastEma,
      trendPct,
    };
  }

  // ── 6. Time budget (from per-frame spans) ───────────────────────────────
  const avgFrameMs = ftStats ? ftStats.avg : 0;
  const timeBudget = _computeTimeBudgetFromSpans(timeline, avgFrameMs);

  // ── 6b. Per-phase time budget ───────────────────────────────────────────
  const phaseBudget = _computeTimeBudgetByPhase(timeline);

  // ── 7. Long tasks ───────────────────────────────────────────────────────
  const longTaskSummary = longTasks.length > 0 ? {
    count: longTasks.length,
    totalDuration: longTasks.reduce((s, t) => s + t.duration, 0),
    tasks: longTasks,
  } : null;

  // ── 8. Warnings (condensed) ─────────────────────────────────────────────
  const warnings = [];

  if (ftStats && ftStats.avg > HITCH_THRESHOLD) {
    warnings.push(`Average frame time ${_r1(ftStats.avg)}ms exceeds ${HITCH_THRESHOLD}ms (sub-20fps)`);
  } else if (ftStats && ftStats.avg > BAD_THRESHOLD) {
    warnings.push(`Average frame time ${_r1(ftStats.avg)}ms exceeds ${_r1(BAD_THRESHOLD)}ms (sub-30fps)`);
  } else if (ftStats && ftStats.avg > TARGET_FRAME_MS) {
    warnings.push(`Average frame time ${_r1(ftStats.avg)}ms exceeds ${_r1(TARGET_FRAME_MS)}ms (sub-60fps)`);
  }

  if (slowClusters.length > 0) {
    warnings.push(`Found ${slowClusters.length} slow-frame clusters (${thBad + thHitch + thMajor} frames >${_r1(BAD_THRESHOLD)}ms)`);
  }

  if (memStats && memStats.limitMB != null && memStats.maxHeap > memStats.limitMB * MEM_WARN_NEAR_LIMIT_RATIO) {
    warnings.push(`Memory heap near limit: ${_r1(memStats.maxHeap)}MB / ${_r1(memStats.limitMB)}MB`);
  }
  if (memStats && memStats.limitMB != null && memStats.avgHeap > memStats.limitMB * MEM_WARN_HIGH_AVG_RATIO) {
    warnings.push(`Sustained high memory: avg ${_r1(memStats.avgHeap)}MB / ${_r1(memStats.limitMB)}MB`);
  }

  // Allocation-rate warning (only when heap delta data is available)
  if (heapDeltaStats && Math.abs(heapDeltaStats.avgMB) > ALLOC_RATE_WARN_MB) {
    warnings.push(
      `High allocation rate: avg ${_r2(heapDeltaStats.avgMB)}MB/frame ` +
      `(max ${_r2(heapDeltaStats.maxMB)}MB) — likely GC contributor`
    );
  }

  // JS overhead warning — invisible work inside the tick
  if (jsOverhead && jsOverhead.invisibleRatio > JS_OVERHEAD_WARN_RATIO) {
    const pct = _r1(jsOverhead.invisibleRatio * 100);
    warnings.push(
      `${pct}% of JS tick time is invisible to instrumentation ` +
      `— likely GC or untimed code paths`
    );
  }
  if (jsOverhead && jsOverhead.invisibleRatio > JS_OVERHEAD_HIGH_WARN_RATIO && thHitch > 0) {
    const pct = _r1(jsOverhead.invisibleRatio * 100);
    warnings.push(
      `${pct}% JS overhead + ${thHitch} hitches with Long Task API ` +
      `${longTaskObserverActive ? 'active' : 'unavailable'} — ` +
      `GC is the most likely common cause`
    );
  }

  if (timeBudget.pctUnaccounted > UNACCOUNTED_FRAME_WARN_PCT && ftValues.length > 0 && thHitch > 0) {
    warnings.push(
      `${_r1(timeBudget.pctUnaccounted)}% of frame time is unmeasured ` +
      `(${thHitch + thMajor} hitches >${_r1(HITCH_THRESHOLD)}ms with little measured work)`
    );
  }

  // Warn when Long Task API was unavailable but hitches occurred
  if (thHitch > 0 && !longTaskObserverActive) {
    warnings.push(
      `Long Task API unavailable — hitches >50ms may be GC, layout, or paint events ` +
      `invisible to JS instrumentation`
    );
  }

  // ── Variance-ratio warnings ──
  // Flag spans whose max call time is more than 5x their average (≥5 calls),
  // which suggests intermittent bottlenecks rather than steady load.
  for (const [name, s] of Object.entries(spanStats)) {
    if (s.frameCallCount >= VARIANCE_WARN_MIN_CALLS && s.avgCall > 0 && s.max > s.avgCall * VARIANCE_WARN_RATIO_MULTIPLIER) {
      const ratio = (s.max / s.avgCall).toFixed(1);
      warnings.push(
        `${name}: max=${_r1(s.max)}ms is ${ratio}x the average of ${_r2(s.avgCall)}ms ` +
        `(possible intermittent bottleneck)`
      );
    }
  }

  // Find the span with the worst max value for surfacing in the summary
  const worstSpanEntry = (() => {
    let worstName = null;
    let worstMax = 0;
    for (const [name, s] of Object.entries(spanStats)) {
      if (s.max > worstMax) {
        worstMax = s.max;
        worstName = name;
      }
    }
    return worstName ? { name: worstName, max: worstMax } : null;
  })();

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

  // ── 9. Assemble report ──────────────────────────────────────────────────

  const report = {
    interval: { start, end, durationMs, pollCount },
    summary: {
      fps: fpsStats ? { ...fpsStats, low1Pct: lowFps.p1Low, low01Pct: lowFps.p01Low } : null,
      frameTime: ftStats ? { ...ftStats, buckets: ftBuckets } : null,
      memory: memStats,
      longFrames,
    },
    measurements,
    spanStats,
    contextBreakdown,
    ctxSlowSummary,
    slowClusters: slowClusters.map(c => ({
      startTs: c.startTs,
      endTs: c.endTs,
      count: c.count,
      worstMs: c.worstMs,
      context: c.context,
    })),
    timeBudget,
    phaseBudget,
    worstSpan: worstSpanEntry,
    jsOverhead,
    heapDeltaStats,
    longTasks: longTaskSummary,
    warnings,
    timeline, // kept for programmatic use; not printed
    formatted: '',
  };

  report.formatted = _formatReport(report);

  return report;
}

// ─── Formatted report ──────────────────────────────────────────────────────

/**
 * Build the formatted string version of a report — summary-first, no raw timeline.
 * @param {CaptureReport} report
 * @returns {string}
 */
function _formatReport(report) {
  const { interval, summary, spanStats, contextBreakdown, ctxSlowSummary,
    slowClusters, timeBudget, phaseBudget, worstSpan, longTasks, warnings,
    jsOverhead, heapDeltaStats } = report;

  let s = `=== Performance Capture Report ===\n`;
  s += `Duration: ${_r1(interval.durationMs / 1000)}s  Frames: ${interval.pollCount}\n`;

  // ── Summary ──
  s += `\n─── Summary ───\n`;
  if (summary.frameTime) {
    const ft = summary.frameTime;
    s += `Frame:  median=${_r1(ft.median)}ms  avg=${_r1(ft.avg)}ms  `;
    s += `p95=${_r1(ft.p95)}ms  p99=${_r1(ft.p99)}ms  max=${_r1(ft.max)}ms\n`;

    const b = ft.buckets;
    s += `        good≤${_r1(GOOD_THRESHOLD)}ms:${b.good}  `;
    s += `missed:${b.missed60}  bad>${_r1(BAD_THRESHOLD)}ms:${b.bad}  `;
    s += `hitch>${_r1(HITCH_THRESHOLD)}ms:${b.hitch}  major>${_r1(MAJOR_HITCH_THRESHOLD)}ms:${b.majorHitch}\n`;
  }

  if (summary.fps) {
    const f = summary.fps;
    s += `FPS:    avg=${_r1(f.avg)}  min=${_r1(f.min)}  `;
    if (f.low1Pct > 0) s += `1% low=${_r1(f.low1Pct)}  `;
    if (f.low01Pct > 0) s += `0.1% low=${_r1(f.low01Pct)}  `;
    s += `max=${_r1(f.max)}\n`;
  }

  if (summary.memory) {
    const m = summary.memory;
    s += `Memory: avg=${_r1(m.avgHeap)}MB  max=${_r1(m.maxHeap)}MB`;
    if (m.limitMB != null) s += `  limit=${_r1(m.limitMB)}MB`;
    if (heapDeltaStats) {
      s += `  alloc=${_r2(heapDeltaStats.avgMB)}MB/frame`;
    }
    s += '\n';
  }

  // JS invisible-overhead line
  if (jsOverhead) {
    s += `JS ovh: avg=${_r2(jsOverhead.invisibleAvgPerFrame)}ms/frame (${_r1(jsOverhead.invisibleRatio * 100)}% untimed)\n`;
  }

  // Surface the span with the worst max value as a one-liner
  if (worstSpan) {
    s += `Worst span: ${worstSpan.name} (max=${_r1(worstSpan.max)}ms)\n`;
  }

  // ── Slow frames by context ──
  const ctxNames = Object.keys(ctxSlowSummary).sort();
  if (ctxNames.length > 0) {
    s += `\n─── Slow Frames by Context ───\n`;
    for (const phase of ctxNames) {
      const cs = ctxSlowSummary[phase];
      s += `  ${phase.padEnd(14)} ${cs.slow} slow, ${cs.hitches} hitches, worst=${_r1(cs.worst)}ms\n`;
    }
  }

  // ── Slow clusters ──
  if (slowClusters.length > 0) {
    s += `\n─── Slow Clusters (${slowClusters.length}) ───\n`;
    for (let i = 0; i < slowClusters.length; i++) {
      const c = slowClusters[i];
      s += `  Cluster ${i + 1}: ${c.count} frames >${_r1(BAD_THRESHOLD)}ms, worst=${_r1(c.worstMs)}ms\n`;
      s += `    context: ${c.context}\n`;
    }
    s += '\n';
  }

  // ── Worst Frames Drill-Down ──
  const worstFrames = _buildWorstFrames(report.timeline, WORST_FRAMES_COUNT);
  s += `\n─── Worst 5 Frames by frameTime ───\n`;
  if (worstFrames.length > 0) {
    for (const wf of worstFrames) {
      s += `  Frame #${wf.frameIndex}: ${_r1(wf.frameTime)}ms  context: ${wf.context}\n`;
      for (const sp of wf.spans) {
        s += `    ${sp.name.padEnd(14)} ${_r2(sp.ms).padStart(7)}ms  (${sp.count} calls)\n`;
      }
    }
  } else {
    s += `  (none — no frame time data)\n`;
  }

  // ── Measured spans (from per-frame deltas) ──
  const spanNames = Object.keys(spanStats).sort();
  if (spanNames.length > 0) {
    const namePad = Math.max(...spanNames.map(n => n.length), 10) + 1;
    s += `─── Measured Spans ───\n`;
    for (const name of spanNames) {
      const sp = spanStats[name];
      const pad = name.padEnd(namePad);
      const callsS = `calls=${sp.frameCallCount}`.padEnd(12);
      const totalS = `total=${_r2(sp.totalMs)}ms`.padEnd(14);
      const avgS = `avg=${_r2(sp.avgCall)}ms`.padEnd(12);
      const maxS = `max=${_r2(sp.max)}ms`.padEnd(12);
      s += `  ${pad}${callsS}${totalS}${avgS}${maxS}\n`;
    }
  }

  // ── Time budget ──
  if (timeBudget && timeBudget.items.length > 0) {
    s += `\n─── Time Budget${timeBudget.hasNesting ? ' (exclusive times)' : ''} ───\n`;
    if (timeBudget.hasNesting) {
      s += `  (nested spans shown as self-time — children subtracted from parents)\n`;
    }
    for (const item of timeBudget.items) {
      const costMs = `cost=${_r2(item.perFrameMs)}ms`.padEnd(16);
      const pct = `${_r1(item.pctOfFrame)}%`.padEnd(8);
      s += `  ${item.name.padEnd(16)} ${costMs} ${pct} of frame`;
      if (item.avgCall > 0) s += `  avg=${_r2(item.avgCall)}ms/call`;
      s += '\n';
    }
    s += `  ${'unaccounted'.padEnd(16)} cost=${_r2(timeBudget.perFrameUnaccountedMs)}ms  ${_r1(timeBudget.pctUnaccounted)}% of frame\n`;
  }

  // ── Per-phase time budget ──
  if (phaseBudget && phaseBudget.length > 1) {
    s += `\n─── Per-Phase Time Budget ───\n`;
    for (const pb of phaseBudget) {
      s += `  ${pb.phase.padEnd(14)} avg=${_r1(pb.avgFrameMs)}ms  `;
      s += `unaccounted=${_r1(pb.pctUnaccounted)}%  `;
      s += `(${pb.frameCount} frames)\n`;
    }
  }

  // ── Long tasks ──
  s += `\n─── Long Tasks ───\n`;
  if (longTasks && longTasks.count > 0) {
    s += `  Total duration: ${_r1(longTasks.totalDuration)}ms\n`;
    for (const t of longTasks.tasks) {
      s += `  - ${t.name}: ${_r1(t.duration)}ms at t=${_r1(t.startTime)}\n`;
    }
  } else {
    s += `  none detected\n`;
  }

  // ── Warnings ──
  if (warnings.length > 0) {
    s += `\n─── Warnings (${warnings.length}) ───\n`;
    for (const w of warnings) {
      s += `  - ${w}\n`;
    }
  }

  s += `\n=== End Report ===`;
  return s;
}

/**
 * @typedef {import('./frameProfiler.js').FrameEntry} FrameEntry
 */

/**
 * @typedef {Object} CaptureReport
 * @property {{ start: number, end: number, durationMs: number, pollCount: number }} interval
 * @property {{ fps: object|null, frameTime: object|null, memory: object|null, longFrames: object }} summary
 * @property {Object<string, object>} measurements
 * @property {Object<string, object>} spanStats
 * @property {Object<string, { frames: number, min: number, max: number, avg: number, median: number, p95: number, p99: number, framesGt33: number, framesGt50: number }>} contextBreakdown
 * @property {Object<string, { slow: number, hitches: number, worst: number }>} ctxSlowSummary
 * @property {Array<{ startTs: number, endTs: number, count: number, worstMs: number, context: string }>} slowClusters
 * @property {{ items: Array<{ name: string, totalMs: number, exclusiveMs: number, perFrameMs: number, pctOfFrame: number, callCount: number, avgCall: number, maxCall: number }>, hasNesting: boolean, totalMeasuredMs: number, perFrameMeasuredMs: number, perFrameUnaccountedMs: number, pctUnaccounted: number }|null} timeBudget
 * @property {{ frameJsTotalMs: number, frameJsCalls: number, frameJsAvgPerFrame: number, measuredAvgPerFrame: number, invisibleAvgPerFrame: number, invisibleRatio: number }|null} jsOverhead
 * @property {{ avgBytes: number, maxBytes: number, minBytes: number, avgMB: number, maxMB: number }|null} heapDeltaStats
 * @property {{ count: number, totalDuration: number, tasks: Array<{ startTime: number, duration: number, name: string }> }|null} longTasks
 * @property {string[]} warnings
 * @property {FrameEntry[]} timeline
 * @property {string} formatted
 */
