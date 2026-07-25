/**
 * captureLogger.js — Continuous performance capture and reporting.
 *
 * Fills in the reserved startCapture() / stopCapture() / getCaptureReport()
 * interface from snapshot.js. Captures time-series performance data over an
 * interval and produces a rich, structured report with percentile stats,
 * frame-time bucketing, memory tracking, and human-readable warnings.
 *
 * Layer: dev/ — depends on measurements, frameTracker, and clockScheduler.
 */

import { getClock } from '../../shared/clockScheduler.js';
import { getRawMeasurements } from './measurements.js';
import { getFps, getLastFrameTime } from './frameTracker.js';

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {import('./captureLogger.js').CaptureState|null} */
let _captureState = null;

/** @type {import('./captureLogger.js').CaptureReport|null} */
let _lastReport = null;

// ─── Percentile helpers ────────────────────────────────────────────────────

/**
 * Compute the p-th percentile from a sorted array (ascending).
 * Uses linear interpolation between adjacent values.
 * @param {number[]} sorted
 * @param {number} p — 0-100
 * @returns {number}
 */
function _percentile(sorted, p) {
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
function _computeStats(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: _percentile(sorted, 50),
    p95: _percentile(sorted, 95),
    p99: _percentile(sorted, 99),
  };
}

/**
 * Compute frame-time bucket counts.
 * @param {number[]} frameTimes
 * @returns {{ under8: number, under16: number, under33: number, under50: number, over50: number }}
 */
function _bucketFrameTimes(frameTimes) {
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
 * Detect long frames and generate warnings.
 * @param {Array<{ timestamp: number, frameTime: number }>} timeline
 * @returns {{ warnings: string[], longFrames: { total: number, threshold16: number, threshold33: number, threshold50: number } }}
 */
function _analyzeLongFrames(timeline) {
  const warnings = [];
  let threshold16 = 0, threshold33 = 0, threshold50 = 0;
  for (const entry of timeline) {
    const ft = entry.frameTime;
    if (ft > 50) {
      threshold50++;
      warnings.push(`Frame time >50ms at t=${entry.timestamp.toFixed(0)}ms (${ft.toFixed(1)}ms)`);
    } else if (ft > 33) {
      threshold33++;
      warnings.push(`Frame time >33ms at t=${entry.timestamp.toFixed(0)}ms (${ft.toFixed(1)}ms)`);
    } else if (ft > 16) {
      threshold16++;
    }
  }
  return {
    warnings,
    longFrames: { total: threshold16 + threshold33 + threshold50, threshold16, threshold33, threshold50 },
  };
}

/**
 * Build the formatted string version of a report.
 * @param {import('./captureLogger.js').CaptureReport} report
 * @returns {string}
 */
function _formatReport(report) {
  const { interval, summary, measurements, warnings } = report;

  let s = `=== Performance Capture Report ===\n`;
  s += `Duration: ${(interval.durationMs / 1000).toFixed(1)}s  Polls: ${interval.pollCount}\n\n`;

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

// ─── Polling callback ──────────────────────────────────────────────────────

function _poll() {
  const state = _captureState;
  if (!state) return;

  const timestamp = performance.now();
  const fps = getFps();
  const frameTime = getLastFrameTime();
  const _measurements = getRawMeasurements();

  // Snapshot all enabled measurements
  const measSnapshot = {};
  for (const [name, m] of Object.entries(_measurements)) {
    if (m.enabled && m.count > 0) {
      measSnapshot[name] = {
        ema: m.ema ?? 0,
        avg: m.total / m.count,
        count: m.count,
        total: m.total,
      };
    }
  }

  // Memory (Chrome-only)
  let memory = null;
  if (performance.memory) {
    memory = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }

  const snapshot = { timestamp, fps, frameTime, measurements: measSnapshot, memory };
  state.timeline.push(snapshot);
  state.pollCount++;

  // Check duration-based auto-stop
  if (state.durationMs != null && (timestamp - state.startTime) >= state.durationMs) {
    _finishCapture();
  }
}

function _finishCapture() {
  const state = _captureState;
  if (!state) return;

  // Stop polling
  if (state.intervalId != null) {
    getClock().clearInterval(state.intervalId);
    state.intervalId = null;
  }

  // --- Build report ---

  const timeline = state.timeline;
  const start = state.startTime;
  const end = timeline.length > 0 ? timeline[timeline.length - 1].timestamp : start;
  const durationMs = end - start;
  const pollCount = state.pollCount;

  // FPS stats
  const fpsValues = timeline.map(e => e.fps).filter(v => v > 0);
  const fpsStats = _computeStats(fpsValues);

  // Frame time stats
  const ftValues = timeline.map(e => e.frameTime).filter(v => v > 0);
  const ftStats = _computeStats(ftValues);
  const ftBuckets = _bucketFrameTimes(ftValues);

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

  // Long frame analysis
  const ftTimeline = timeline
    .filter(e => e.frameTime > 0)
    .map(e => ({ timestamp: e.timestamp, frameTime: e.frameTime }));
  const { warnings: longWarnings, longFrames } = _analyzeLongFrames(ftTimeline);

  // Per-measurement stats across all snapshots
  const measByName = {};
  for (const snap of timeline) {
    for (const [name, m] of Object.entries(snap.measurements)) {
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

    const avgStats = _computeStats(avgs);
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

  // Collect warnings
  const warnings = [...longWarnings];

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

  // Build report
  const report = {
    interval: { start, end, durationMs, pollCount },
    summary: {
      fps: fpsStats,
      frameTime: ftStats ? { ...ftStats, buckets: ftBuckets } : null,
      memory: memStats,
      longFrames,
    },
    measurements,
    warnings,
    timeline: state.keepTimeline ? timeline : null,
    formatted: '',
  };

  report.formatted = _formatReport(report);

  _lastReport = report;
  _captureState = null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start a performance capture session.
 *
 * Polls performance data periodically and stores time-series snapshots.
 * Can run for a fixed duration or until stopCapture() is called manually.
 *
 * @param {object} [opts]
 * @param {number} [opts.durationMs] — Auto-stop after this many ms. Omit for manual stop.
 * @param {number} [opts.intervalMs=500] — Polling interval in ms.
 * @param {boolean} [opts.keepTimeline=false] — Include raw time-series in the report.
 * @returns {{ started: boolean, message: string }}
 */
export function startCapture({ durationMs, intervalMs = 500, keepTimeline = false } = {}) {
  if (_captureState) {
    return { started: false, message: 'A capture is already in progress. Call stopCapture() first.' };
  }

  const startTime = performance.now();

  const intervalId = getClock().setInterval(_poll, intervalMs, 'ui');

  _captureState = {
    startTime,
    durationMs: durationMs ?? null,
    intervalMs,
    keepTimeline,
    timeline: [],
    pollCount: 0,
    intervalId,
  };

  // Immediately take the first sample so there's data even for short captures
  _poll();

  const durationStr = durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : 'manual stop';
  return { started: true, message: `Capture started (${durationStr}, interval=${intervalMs}ms)` };
}

/**
 * Stop an active capture and return the report.
 * @returns {import('./captureLogger.js').CaptureReport}
 */
export function stopCapture() {
  if (!_captureState) {
    const msg = _lastReport
      ? 'No active capture. Use getCaptureReport() to retrieve the last completed report.'
      : 'No active capture and no previous report available. Call startCapture() first.';
    throw new Error(msg);
  }

  _finishCapture();
  return _lastReport;
}

/**
 * Get the most recently completed capture report without stopping a running capture.
 * @returns {import('./captureLogger.js').CaptureReport|null}
 */
export function getCaptureReport() {
  return _lastReport;
}

/**
 * Check whether a capture is currently in progress.
 * @returns {boolean}
 */
export function isCaptureActive() {
  return _captureState !== null;
}
