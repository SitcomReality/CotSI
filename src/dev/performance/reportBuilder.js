/**
 * reportBuilder.js — Performance report analysis and formatting.
 *
 * Takes a set of per-frame entries recorded by frameProfiler and produces
 * a rich CaptureReport with overall stats, per-context breakdown, spike
 * correlation, time-budget analysis, and formatted output.
 *
 * Layer: dev/ — depends on stats.js and the FrameEntry type.
 */

import { computeStats, bucketFrameTimes } from './stats.js';

// ─── Report builder ────────────────────────────────────────────────────────

/**
 * Build a complete CaptureReport from recorded frame entries.
 *
 * @param {FrameEntry[]} frames — ordered array of per-frame entries
 * @param {{ start: number, end: number, durationMs: number, pollCount: number }} interval
 * @returns {CaptureReport}
 */
export function buildReport(frames, interval) {
  const timeline = frames;
  const { start, end, durationMs, pollCount } = interval;

  // ── 1. Overall frame stats ──────────────────────────────────────────────

  const ftValues = timeline.map(e => e.frameTime).filter(v => v > 0);
  const fpsValues = timeline.map(e => e.fps).filter(v => v > 0);
  const fpsStats = computeStats(fpsValues);
  const ftStats = computeStats(ftValues);
  const ftBuckets = ftStats ? bucketFrameTimes(ftValues) : null;

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

  // ── 3. Long frames & spike warnings (with context) ──────────────────────
  let th16 = 0, th33 = 0, th50 = 0;
  const warnings = [];

  for (const entry of timeline) {
    const ft = entry.frameTime;
    if (ft <= 0) continue;

    const ctx = entry.context;
    const ctxSuffix = ctx
      ? ` — ${ctx.phase}${ctx.championName ? ': ' + ctx.championName : ''}${ctx.action ? ' (' + ctx.action + ')' : ''}`
      : '';

    if (ft > 50) {
      th50++;
      warnings.push(`Frame time >50ms at t=${entry.timestamp.toFixed(0)}ms (${ft.toFixed(1)}ms)${ctxSuffix}`);
    } else if (ft > 33) {
      th33++;
      warnings.push(`Frame time >33ms at t=${entry.timestamp.toFixed(0)}ms (${ft.toFixed(1)}ms)${ctxSuffix}`);
    } else if (ft > 16) {
      th16++;
    }
  }

  const longFrames = { total: th16 + th33 + th50, threshold16: th16, threshold33: th33, threshold50: th50 };

  // ── 4. Per-context breakdown ────────────────────────────────────────────
  /** @type {Object<string, number[]>} */
  const frameTimesByPhase = {};
  /** @type {Object<string, { count: number, framesGt33: number, framesGt50: number }>} */
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
    else if (entry.frameTime > 33) contextMeta[phase].framesGt33++;
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

  // ── 5. Per-measurement stats across the timeline ────────────────────────
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

  // ── 6. Time budget analysis ─────────────────────────────────────────────
  // Compute how much of frame time each measurement accounts for.
  // Uses per-frame measurement snapshots: find the first and last entry
  // that contain each measurement and compute delta total.
  const timeBudget = _computeTimeBudget(timeline, ftStats);

  // ── 7. Additional warnings ──────────────────────────────────────────────

  // Memory warnings
  if (memStats && memStats.limitMB != null && memStats.maxHeap > memStats.limitMB * 0.9) {
    warnings.push(`Memory heap near limit: ${memStats.maxHeap.toFixed(1)}MB / ${memStats.limitMB.toFixed(1)}MB`);
  }
  if (memStats && memStats.limitMB != null && memStats.avgHeap > memStats.limitMB * 0.8) {
    warnings.push(`Sustained high memory: avg ${memStats.avgHeap.toFixed(1)}MB / ${memStats.limitMB.toFixed(1)}MB`);
  }

  // Frame time warnings
  if (ftStats && ftStats.avg > 33) {
    warnings.push(`Average frame time ${ftStats.avg.toFixed(1)}ms exceeds 33ms (sub-30fps)`);
  } else if (ftStats && ftStats.avg > 16) {
    warnings.push(`Average frame time ${ftStats.avg.toFixed(1)}ms exceeds 16ms (sub-60fps)`);
  }

  // ── 8. Assemble report ──────────────────────────────────────────────────

  const report = {
    interval: { start, end, durationMs, pollCount },
    summary: {
      fps: fpsStats,
      frameTime: ftStats ? { ...ftStats, buckets: ftBuckets } : null,
      memory: memStats,
      longFrames,
    },
    measurements,
    contextBreakdown,
    timeBudget,
    warnings,
    timeline,
    formatted: '',
  };

  report.formatted = _formatReport(report);

  return report;
}

// ─── Time budget computation ───────────────────────────────────────────────

function _computeTimeBudget(timeline, ftStats) {
  if (ftStats == null) return null;

  // For each measurement, compute delta total between first and last
  // snapshot that contain it. This tells us the cumulative measured time
  // during this capture window.
  const firstTotals = {};
  const lastTotals = {};
  const firstNames = new Set();
  const lastNames = new Set();

  // First pass: find first snapshot for each measurement
  for (const entry of timeline) {
    for (const name of Object.keys(entry.measurements)) {
      if (!firstNames.has(name)) {
        firstNames.add(name);
        firstTotals[name] = entry.measurements[name].total;
      }
    }
    if (firstNames.size >= Object.keys(firstTotals).length) break;
  }

  // Last pass: find last snapshot for each measurement
  for (let i = timeline.length - 1; i >= 0; i--) {
    const entry = timeline[i];
    for (const name of Object.keys(entry.measurements)) {
      if (!lastNames.has(name)) {
        lastNames.add(name);
        lastTotals[name] = entry.measurements[name].total;
      }
    }
    if (lastNames.size >= Object.keys(lastTotals).length) break;
  }

  const items = [];
  let totalMeasured = 0;

  for (const name of Object.keys(firstTotals)) {
    const firstT = firstTotals[name];
    const lastT = lastTotals[name];
    if (lastT != null && lastT > firstT) {
      const delta = lastT - firstT;
      totalMeasured += delta;
      const lastEntry = timeline[timeline.length - 1];
      const avgPct = ftStats.avg > 0 ? (delta / timeline.length / ftStats.avg) * 100 : 0;
      items.push({ name, totalMs: delta, perFrameMs: delta / timeline.length, pctOfFrame: avgPct });
    }
  }

  // Sort by per-frame cost descending
  items.sort((a, b) => b.perFrameMs - a.perFrameMs);

  const avgFrameMs = ftStats.avg;
  const perFrameMeasured = timeline.length > 0 ? totalMeasured / timeline.length : 0;
  const perFrameUnaccounted = Math.max(0, avgFrameMs - perFrameMeasured);

  return {
    items,
    totalMeasuredMs: totalMeasured,
    perFrameMeasuredMs: perFrameMeasured,
    perFrameUnaccountedMs: perFrameUnaccounted,
    pctUnaccounted: avgFrameMs > 0 ? (perFrameUnaccounted / avgFrameMs) * 100 : 0,
  };
}

// ─── Formatted report ──────────────────────────────────────────────────────

/**
 * Build the formatted string version of a report.
 * @param {CaptureReport} report
 * @returns {string}
 */
function _formatReport(report) {
  const { interval, summary, measurements, contextBreakdown, timeBudget, warnings } = report;

  let s = `=== Performance Capture Report ===\n`;
  s += `Duration: ${(interval.durationMs / 1000).toFixed(1)}s  Frames: ${interval.pollCount}\n\n`;

  // FPS
  if (summary.fps) {
    const f = summary.fps;
    s += `FPS:      avg=${f.avg.toFixed(1)}  min=${f.min.toFixed(1)}  max=${f.max.toFixed(1)}  `;
    s += `p95=${f.p95.toFixed(1)}  p99=${f.p99.toFixed(1)}\n`;
  }

  // Frame time
  if (summary.frameTime) {
    const ft = summary.frameTime;
    s += `Frame:    avg=${ft.avg.toFixed(1)}ms  min=${ft.min.toFixed(1)}ms  max=${ft.max.toFixed(1)}ms  `;
    s += `p95=${ft.p95.toFixed(1)}ms  p99=${ft.p99.toFixed(1)}ms\n`;

    const b = ft.buckets;
    s += `Buckets:  ≤8ms:${b.under8}  ≤16ms:${b.under16}  ≤33ms:${b.under33}  ≤50ms:${b.under50}  >50ms:${b.over50}\n`;
  }

  // Memory
  if (summary.memory) {
    const m = summary.memory;
    s += `Memory:   heap=${m.avgHeap.toFixed(1)}MB  min=${m.minHeap.toFixed(1)}MB  max=${m.maxHeap.toFixed(1)}MB`;
    if (m.limitMB != null) s += `  limit=${m.limitMB.toFixed(1)}MB`;
    s += '\n';
  }

  s += '\n';

  // Time budget
  if (timeBudget && timeBudget.items.length > 0) {
    s += `─── Time Budget ───\n`;
    for (const item of timeBudget.items) {
      const costMs = `cost=${item.perFrameMs.toFixed(2)}ms`.padEnd(16);
      const pct = `${item.pctOfFrame.toFixed(1)}%`.padEnd(8);
      s += `  ${item.name.padEnd(16)} ${costMs} ${pct} of frame\n`;
    }
    s += `  ${'unaccounted'.padEnd(16)} cost=${timeBudget.perFrameUnaccountedMs.toFixed(2)}ms  ${timeBudget.pctUnaccounted.toFixed(1)}% of frame\n`;
    s += '\n';
  }

  // Measurements
  const mNames = Object.keys(measurements).sort();
  if (mNames.length > 0) {
    const namePad = Math.max(...mNames.map(n => n.length), 10) + 1;
    s += `─── Measurements ───\n`;
    for (const name of mNames) {
      const m = measurements[name];
      const pad = name.padEnd(namePad);
      const avgS = `avg=${m.avg.toFixed(2)}ms`.padEnd(14);
      const minS = `min=${m.min.toFixed(2)}ms`.padEnd(12);
      const maxS = `max=${m.max.toFixed(2)}ms`.padEnd(12);
      const p95S = `p95=${m.p95.toFixed(2)}ms`.padEnd(12);
      const cntS = `n=${m.count}`.padEnd(8);
      let trendS = '';
      if (m.trendPct != null) {
        const sign = m.trendPct >= 0 ? '+' : '';
        trendS = `trend=${sign}${m.trendPct.toFixed(1)}%`;
      }
      s += `${pad}${avgS}${minS}${maxS}${p95S}${cntS}${trendS}\n`;
    }
    s += '\n';
  }

  // Context breakdown
  const ctxNames = Object.keys(contextBreakdown).sort();
  if (ctxNames.length > 0) {
    s += `─── Context Breakdown ───\n`;
    const phasePad = Math.max(...ctxNames.map(n => n.length), 8) + 1;
    for (const phase of ctxNames) {
      const ctx = contextBreakdown[phase];
      const pad = phase.padEnd(phasePad);
      const framesS = `frames=${ctx.frames}`.padEnd(10);
      const avgS = `avg=${ctx.avg.toFixed(1)}ms`.padEnd(12);
      const maxS = `max=${ctx.max.toFixed(1)}ms`.padEnd(12);
      const gt33 = ctx.framesGt33 > 0 ? ` >33ms:${ctx.framesGt33}` : '';
      const gt50 = ctx.framesGt50 > 0 ? ` >50ms:${ctx.framesGt50}` : '';
      s += `  ${pad}${framesS}${avgS}${maxS}${gt33}${gt50}\n`;
    }
    s += '\n';
  }

  // Warnings
  if (warnings.length > 0) {
    s += `─── Warnings (${warnings.length}) ───\n`;
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
 * @property {Object<string, { frames: number, min: number, max: number, avg: number, median: number, p95: number, p99: number, framesGt33: number, framesGt50: number }>} contextBreakdown
 * @property {{ items: Array<{ name: string, totalMs: number, perFrameMs: number, pctOfFrame: number }>, totalMeasuredMs: number, perFrameMeasuredMs: number, perFrameUnaccountedMs: number, pctUnaccounted: number }|null} timeBudget
 * @property {string[]} warnings
 * @property {FrameEntry[]} timeline
 * @property {string} formatted
 */
