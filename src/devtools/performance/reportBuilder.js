/**
 * reportBuilder.js — Performance report orchestration.
 *
 * Takes a set of per-frame entries recorded by frameProfiler and assembles
 * a rich CaptureReport by delegating to the analysis modules in report/:
 * summary stats, per-context breakdown, spike clustering, span analysis,
 * time-budget analysis, warnings, and formatted output.
 *
 * Layer: dev/ — depends on the report/ analysis modules and the FrameEntry type.
 */

import { computeStats } from './stats.js';
import { aggregateSpans, computeExclusiveSpanTimes, computeJsOverhead } from './report/spanAnalysis.js';
import { computeTimeBudgetFromSpans, computeTimeBudgetByPhase } from './report/timeBudget.js';
import { buildSlowClusters } from './report/slowClusters.js';
import { computeOverallSummary, computeContextBreakdown } from './report/frameSummary.js';
import { collectWarnings } from './report/warnings.js';
import { formatReport } from './report/reportFormatter.js';

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
  const slowClusters = buildSlowClusters(timeline);
  const summary = computeOverallSummary(timeline);
  const { contextBreakdown, ctxSlowSummary } = computeContextBreakdown(timeline);

  // ── Per-measurement span stats ──────────────────────────────────────────
  const spanStats = aggregateSpans(timeline);
  const exclusiveTimes = computeExclusiveSpanTimes(spanStats);
  const jsOverhead = computeJsOverhead(spanStats, exclusiveTimes);

  // Also keep the old cumulative measurement snapshots for compatibility
  const measurements = aggregateMeasurementSnapshots(timeline);

  // ── Time budget (from per-frame spans) ──────────────────────────────────
  const avgFrameMs = summary.ftStats ? summary.ftStats.avg : 0;
  const timeBudget = computeTimeBudgetFromSpans(timeline, avgFrameMs);
  const phaseBudget = computeTimeBudgetByPhase(timeline);

  // ── Long tasks ──────────────────────────────────────────────────────────
  const longTaskSummary = longTasks.length > 0 ? {
    count: longTasks.length,
    totalDuration: longTasks.reduce((s, t) => s + t.duration, 0),
    tasks: longTasks,
  } : null;

  // ── Warnings ────────────────────────────────────────────────────────────
  const warnings = collectWarnings({
    ftStats: summary.ftStats,
    slowClusters,
    longFrames: summary.longFrames,
    memStats: summary.memStats,
    heapDeltaStats: summary.heapDeltaStats,
    jsOverhead,
    timeBudget,
    spanStats,
  }, longTaskObserverActive);

  // Find the span with the worst max value for surfacing in the summary
  const worstSpan = findWorstSpan(spanStats);

  // ── Assemble report ─────────────────────────────────────────────────────

  const report = {
    interval: { start, end, durationMs, pollCount },
    summary: {
      fps: summary.fpsStats ? { ...summary.fpsStats, low1Pct: summary.lowFps.p1Low, low01Pct: summary.lowFps.p01Low } : null,
      frameTime: summary.ftStats ? { ...summary.ftStats, buckets: summary.ftBuckets } : null,
      memory: summary.memStats,
      longFrames: summary.longFrames,
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
    worstSpan,
    jsOverhead,
    heapDeltaStats: summary.heapDeltaStats,
    longTasks: longTaskSummary,
    warnings,
    timeline, // kept for programmatic use; not printed
    formatted: '',
  };

  report.formatted = formatReport(report);

  return report;
}

/**
 * Aggregate the old cumulative per-measurement snapshots (ema/avg/total/count)
 * into per-name stats for the report.
 *
 * @param {FrameEntry[]} timeline
 */
function aggregateMeasurementSnapshots(timeline) {
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

  return measurements;
}

/**
 * Find the span with the worst max value, for surfacing in the report summary.
 *
 * @param {Object<string, { max: number }>} spanStats
 * @returns {{ name: string, max: number }|null}
 */
function findWorstSpan(spanStats) {
  let worstName = null;
  let worstMax = 0;
  for (const [name, s] of Object.entries(spanStats)) {
    if (s.max > worstMax) {
      worstMax = s.max;
      worstName = name;
    }
  }
  return worstName ? { name: worstName, max: worstMax } : null;
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
