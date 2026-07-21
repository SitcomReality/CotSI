/**
 * devPerformance.js — Lightweight per-frame profiler.
 *
 * Provides FPS tracking, named timing measurements (with EMA + lifetime avg),
 * a live DOM overlay, and optional User Timing API integration.
 *
 * Layer: dev/ — imports clockScheduler, no game state dependencies.
 */

import { getClock } from '../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

const _measurements = {}; // name -> { total, count, ema, enabled }
let _fpsHistory = [];
let _lastFrameTime = 0;
let _overlayEnabled = false;
let _deregisterTick = null;
let _overlayEl = null;

const EMA_ALPHA = 0.3;
const FPS_SAMPLES = 30;

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
 * Toggle the live FPS/timing overlay on/off.
 * @param {boolean} on
 */
export function setOverlayEnabled(on) {
  _overlayEnabled = on;

  if (on) {
    // Create overlay element if needed
    if (!_overlayEl) {
      _overlayEl = document.createElement('div');
      _overlayEl.id = 'devPerfOverlay';
      document.body.appendChild(_overlayEl);
    }
    _overlayEl.classList.add('is-visible');

    // Start frame tracking
    if (!_deregisterTick) {
      _deregisterTick = getClock().onTick(_onFrame);
    }
  } else {
    if (_overlayEl) {
      _overlayEl.classList.remove('is-visible');
    }
  }
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
 * Get current FPS.
 * @returns {number} — 0 if insufficient data
 */
export function getFps() {
  if (_fpsHistory.length < 2) return 0;
  const recent = _fpsHistory.slice(-FPS_SAMPLES);
  const totalMs = recent[recent.length - 1] - recent[0];
  if (totalMs <= 0) return 0;
  return ((recent.length - 1) / totalMs) * 1000;
}

/**
 * Get the current frame time in ms (last frame duration).
 * @returns {number}
 */
export function getLastFrameTime() {
  return _lastFrameTime;
}

/**
 * Ensure the frame tracker is running (called after dev tools init).
 */
export function ensureFrameTracking() {
  if (!_deregisterTick) {
    _deregisterTick = getClock().onTick(_onFrame);
  }
}

// ─── Frame callback ────────────────────────────────────────────────────────

let _previousTick = 0;

function _onFrame(timestamp) {
  if (_previousTick > 0) {
    _lastFrameTime = timestamp - _previousTick;
  }
  _previousTick = timestamp;
  _fpsHistory.push(timestamp);
  if (_fpsHistory.length > FPS_SAMPLES * 2) {
    _fpsHistory = _fpsHistory.slice(-FPS_SAMPLES);
  }

  // Update overlay if visible
  if (_overlayEnabled && _overlayEl && _overlayEl.classList.contains('is-visible')) {
    _updateOverlay();
  }
}

// ─── Overlay rendering ─────────────────────────────────────────────────────

function _updateOverlay() {
  const fps = getFps();
  const frame = _lastFrameTime.toFixed(1);

  // Collect top-N measurements by EMA
  const entries = Object.entries(_measurements)
    .filter(([, m]) => m.enabled && m.ema !== undefined)
    .map(([name, m]) => ({ name, ema: m.ema }))
    .sort((a, b) => b.ema - a.ema)
    .slice(0, 5);

  let html = `FPS: ${fps.toFixed(1)}  Frame: ${frame}ms`;
  for (const e of entries) {
    html += `<br>${e.name}: ${e.ema.toFixed(2)}ms`;
  }
  _overlayEl.innerHTML = html;
}

// ─── Cleanup ───────────────────────────────────────────────────────────────

/**
 * Clean up the frame tracker and overlay.
 */
export function disposePerformance() {
  if (_deregisterTick) {
    _deregisterTick();
    _deregisterTick = null;
  }
  if (_overlayEl) {
    _overlayEl.remove();
    _overlayEl = null;
  }
  _fpsHistory = [];
  _lastFrameTime = 0;
  _previousTick = 0;
  _overlayEnabled = false;
}
