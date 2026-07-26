/**
 * reportBuilder.js — Performance report analysis and formatting.
 *
 * Takes a set of per-frame entries recorded by frameProfiler and produces
 * a rich CaptureReport with overall stats, per-context breakdown, spike
 * clustering, time-budget analysis, and formatted output.
 *
 * Layer: dev/ — depends on stats.js and the FrameEntry type.
 */

import { computeStats, percentile } from './stats.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const TARGET_FRAME_MS = 1000 / 60; // 16.67
const GOOD_THRESHOLD = TARGET_FRAME_MS + 2;   // ~18.7ms — still basically 60fps
const BAD_THRESHOLD = 33.3;                    // missed 30fps
const HITCH_THRESHOLD = 50;                    // noticeable hitch
const MAJOR_HITCH_THRESHOLD = 100;             // freeze territory

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
        current = { startIndex: i, entries: [], skipCount: 0 };
      }
      current.entries.push(entry);
      current.skipCount = 0;
    } else if (current) {
      current.skipCount++;
      // Tolerate up to 2 non-slow frames between slow ones
      if (current.skipCount > 2) {
        // Flush if the cluster has at least 2 slow frames
        if (current.entries.length >= 2) {
          clusters.push(current);
        }
        current = null;
      }
    }
  }

  // Flush trailing cluster
  if (current && current.entries.length >= 2) {
    clusters.push(current);
  }

  // Convert to summary form
  return clusters.map(c => {
    const worst = c.entries.reduce((a, b) => a.frameTime > b.frameTime ? a : b);
    return {
      startIndex: c.startIndex,
      endIndex: c.entries[c.entries.length - 1].timestamp,
      count: c.entries.length,
      worstMs: worst.frameTime,
      worstEntry: worst,
      context: _contextLabel(worst),
      entries: c.entries,
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

// ─── Time budget (from spans) ───────────────────────────────────────────────

function _computeTimeBudgetFromSpans(frames, avgFrameMs) {
  const spanAgg = _aggregateSpans(frames);
  const items = [];
  let totalMeasured = 0;

  for (const [name, s] of Object.entries(spanAgg)) {
    totalMeasured += s.totalMs;
    const perFrameMs = frames.length > 0 ? s.totalMs / frames.length : 0;
    const pctOfFrame = avgFrameMs > 0 ? (perFrameMs / avgFrameMs) * 100 : 0;
    items.push({
      name,
      totalMs: s.totalMs,
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
    totalMeasuredMs: totalMeasured,
    perFrameMeasuredMs: perFrameMeasured,
    perFrameUnaccountedMs: perFrameUnaccounted,
    pctUnaccounted: avgFrameMs > 0 ? (perFrameUnaccounted / avgFrameMs) * 100 : 0,
  };
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
  const { start, end, durationMs, pollCount } = interval;
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

  if (memStats && memStats.limitMB != null && memStats.maxHeap > memStats.limitMB * 0.9) {
    warnings.push(`Memory heap near limit: ${_r1(memStats.maxHeap)}MB / ${_r1(memStats.limitMB)}MB`);
  }
  if (memStats && memStats.limitMB != null && memStats.avgHeap > memStats.limitMB * 0.8) {
    warnings.push(`Sustained high memory: avg ${_r1(memStats.avgHeap)}MB / ${_r1(memStats.limitMB)}MB`);
  }

  if (timeBudget.pctUnaccounted > 70 && ftValues.length > 0 && thHitch > 0) {
    warnings.push(
      `${_r1(timeBudget.pctUnaccounted)}% of frame time is unmeasured ` +
      `(${thHitch + thMajor} hitches >${_r1(HITCH_THRESHOLD)}ms with little measured work)`
    );
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
      startTs: c.startIndex,
      endTs: c.endIndex,
      count: c.count,
      worstMs: c.worstMs,
      context: c.context,
    })),
    timeBudget,
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
    slowClusters, timeBudget, longTasks, warnings } = report;

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
    s += '\n';
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
    s += `\n─── Time Budget ───\n`;
    for (const item of timeBudget.items) {
      const costMs = `cost=${_r2(item.perFrameMs)}ms`.padEnd(16);
      const pct = `${_r1(item.pctOfFrame)}%`.padEnd(8);
      s += `  ${item.name.padEnd(16)} ${costMs} ${pct} of frame`;
      if (item.avgCall > 0) s += `  avg=${_r2(item.avgCall)}ms/call`;
      s += '\n';
    }
    s += `  ${'unaccounted'.padEnd(16)} cost=${_r2(timeBudget.perFrameUnaccountedMs)}ms  ${_r1(timeBudget.pctUnaccounted)}% of frame\n`;
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
 * @property {{ items: Array<{ name: string, totalMs: number, perFrameMs: number, pctOfFrame: number }>, totalMeasuredMs: number, perFrameMeasuredMs: number, perFrameUnaccountedMs: number, pctUnaccounted: number }|null} timeBudget
 * @property {{ count: number, totalDuration: number, tasks: Array<{ startTime: number, duration: number, name: string }> }|null} longTasks
 * @property {string[]} warnings
 * @property {FrameEntry[]} timeline
 * @property {string} formatted
 */
