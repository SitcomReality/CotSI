/**
 * measurements.js — Named timing measurement infrastructure.
 *
 * Manages named measurements with lifetime average, EMA tracking,
 * and optional User Timing API integration. No DOM, no FPS tracking.
 *
 * Layer: shared/
 */

import { EMA_ALPHA } from '../params/devtools/performanceParams.js';

// ─── State ─────────────────────────────────────────────────────────────────

const _measurements = {}; // name -> { total, count, ema, enabled }
let _allEnabled = false;

/** Frame-delta snapshot: shallow copy of { total, count } per measurement */
let _frameStartSnapshot = null;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start a named measurement. No-op if the measurement is not enabled.
 * @param {string} name
 */
export function startMeasure(name) {
  const m = _measurements[name];
  if (!m || !m.enabled) return;
  const markName = `dev:${name}.start`;
  performance.mark(markName);
  m._startMark = markName;
  m._startTime = performance.now();
}

/**
 * End a named measurement. No-op if not started or not enabled.
 * Updates lifetime avg, EMA, and optionally writes User Timing marks.
 * @param {string} name
 */
export function endMeasure(name) {
  const m = _measurements[name];
  if (!m || !m.enabled) return;
  if (m._startTime === undefined) return;

  const delta = performance.now() - m._startTime;

  // Lifetime average
  m.total += delta;
  m.count += 1;

  // Exponential moving average
  m.ema = m.ema !== undefined ? m.ema * (1 - EMA_ALPHA) + delta * EMA_ALPHA : delta;

  // User Timing API (browser dev tools integration)
  if (m._startMark) {
    performance.mark(`dev:${name}.end`);
    performance.measure(name, m._startMark, `dev:${name}.end`);
    performance.clearMarks(m._startMark);
    performance.clearMarks(`dev:${name}.end`);
    // Keep measures in the buffer so they appear in DevTools; browser manages eviction
  }

  m._startTime = undefined;
  m._startMark = undefined;
}

/**
 * Enable or disable a named measurement.
 * When disabled, startMeasure/endMeasure become no-ops.
 * @param {string} name
 * @param {boolean} enabled
 */
export function setMeasurementEnabled(name, enabled) {
  if (!_measurements[name]) {
    _measurements[name] = { total: 0, count: 0, ema: undefined, enabled: false };
  }
  _measurements[name].enabled = enabled;
}

/**
 * Get current stats for a measurement.
 * @param {string} name
 * @returns {{ avg: number|null, ema: number|null, count: number }|null}
 */
export function getMeasurementStats(name) {
  const m = _measurements[name];
  if (!m || m.count === 0) return null;
  return {
    avg: m.total / m.count,
    ema: m.ema ?? null,
    count: m.count,
  };
}

/**
 * Enable all currently-registered measurements and start frame tracking.
 * Idempotent — only registers new measurements on the first call.
 */
export function enableAllMeasurements() {
  if (_allEnabled) return;
  _allEnabled = true;

  const names = Object.keys(_measurements);
  for (const name of names) {
    setMeasurementEnabled(name, true);
  }
}

/**
 * Snapshot current measurement totals as the baseline for the current frame.
 * Call once per frame before any measurement deltas are computed.
 */
export function startFrameSnapshot() {
  _frameStartSnapshot = {};
  for (const [name, m] of Object.entries(_measurements)) {
    if (m.enabled && m._startTime === undefined) {
      _frameStartSnapshot[name] = { total: m.total, count: m.count };
    }
  }
}

/**
 * Compute per-frame deltas since the last call to startFrameSnapshot().
 * Returns a map of { name: { deltaMs, deltaCount } } for measurements
 * that advanced during the frame. Resets the snapshot for the next frame.
 * @returns {Object<string, { deltaMs: number, deltaCount: number }>}
 */
export function endFrameDeltas() {
  if (!_frameStartSnapshot) return {};

  const deltas = {};
  for (const [name, baseline] of Object.entries(_frameStartSnapshot)) {
    const m = _measurements[name];
    if (!m) continue;
    const deltaMs = m.total - baseline.total;
    const deltaCount = m.count - baseline.count;
    if (deltaMs > 0 || deltaCount > 0) {
      deltas[name] = { deltaMs, deltaCount };
    }
  }

  _frameStartSnapshot = null;
  return deltas;
}

/**
 * Dispose all measurement state.
 */
export function disposeMeasurements() {
  for (const key of Object.keys(_measurements)) {
    delete _measurements[key];
  }
  _allEnabled = false;
  _frameStartSnapshot = null;
}

/**
 * Get a reference to the raw measurements map (for overlay rendering, snapshot).
 * Not part of the stable public API — used internally by sibling modules.
 * @returns {object}
 */
export function getRawMeasurements() {
  return _measurements;
}
