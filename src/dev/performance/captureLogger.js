/**
 * captureLogger.js — Continuous performance capture orchestrator.
 *
 * Thin public API that delegates per-frame recording to frameProfiler
 * and report analysis to reportBuilder. Maintains backward compatibility
 * with the original startCapture/stopCapture/getCaptureReport interface.
 *
 * Layer: dev/ — depends on frameProfiler and reportBuilder.
 */

import { startRecording, stopRecording, isRecording, getRecordingStart } from './frameProfiler.js';
import { buildReport } from './reportBuilder.js';
import { getClock } from '../../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {number|null} Auto-stop timeout handle (from clockScheduler) */
let _autoStopId = null;

/** @type {number} Start timestamp when the capture began */
let _startTime = 0;

/** @type {number} Poll count (frame count for per-frame capture) */
let _pollCount = 0;

/** @type {import('./reportBuilder.js').CaptureReport|null} */
let _lastReport = null;

/** @type {PerformanceObserver|null} Long Task API observer */
let _longTaskObserver = null;

/** @type {boolean} Whether the Long Task observer was successfully registered */
let _longTaskObserverActive = false;

/** @type {Array<{ startTime: number, duration: number, name: string }>} */
let _longTasks = [];

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start a performance capture session.
 *
 * Records per-frame profiling data until stopCapture() is called or
 * the optional duration elapses. Every frame is captured (not polled).
 *
 * @param {object} [opts]
 * @param {number} [opts.durationMs] — Auto-stop after this many ms. Omit for manual stop.
 * @param {number} [opts.intervalMs] — Ignored (kept for backward compat); always per-frame now.
 * @param {boolean} [opts.keepTimeline] — Ignored (always captured; timeline is always in the report).
 * @returns {{ started: boolean, message: string }}
 */
export function startCapture({ durationMs, intervalMs, keepTimeline } = {}) {
  if (isRecording()) {
    return { started: false, message: 'A capture is already in progress. Call stopCapture() first.' };
  }

  _startTime = performance.now();
  _longTasks = [];
  _longTaskObserverActive = false;

  // ── Long Task API observer ──
  // Detects browser main-thread stalls >50ms (GC, layout, paint, etc.)
  // Only register if the browser supports the entry type — avoids console warnings.
  if (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes &&
    PerformanceObserver.supportedEntryTypes.includes('longtask')
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          _longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name || 'unknown',
          });
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      _longTaskObserver = observer;
      _longTaskObserverActive = true;
    } catch (e) {
      // Observation failed — skip silently
      _longTaskObserver = null;
    }
  }

  const result = startRecording();
  if (!result.started) {
    // Disconnect observer if recording failed
    _disconnectLongTaskObserver();
    return result;
  }

  // Auto-stop timeout
  if (durationMs != null) {
    _autoStopId = getClock().setTimeout(() => {
      _finishCapture();
    }, durationMs, 'ui');
  }

  const durationStr = durationMs != null ? `${(durationMs / 1000).toFixed(1)}s` : 'manual stop';
  return { started: true, message: `Capture started (${durationStr}, per-frame)` };
}

/**
 * Stop an active capture and return the report.
 * @returns {import('./reportBuilder.js').CaptureReport}
 */
export function stopCapture() {
  if (!isRecording()) {
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
 * @returns {import('./reportBuilder.js').CaptureReport|null}
 */
export function getCaptureReport() {
  return _lastReport;
}

/**
 * Check whether a capture is currently in progress.
 * @returns {boolean}
 */
export function isCaptureActive() {
  return isRecording();
}

// ─── Internal ──────────────────────────────────────────────────────────────

function _disconnectLongTaskObserver() {
  if (_longTaskObserver) {
    try { _longTaskObserver.disconnect(); } catch (e) { /* ignore */ }
    _longTaskObserver = null;
  }
}

function _finishCapture() {
  // Clear auto-stop
  if (_autoStopId != null) {
    getClock().clearTimeout(_autoStopId);
    _autoStopId = null;
  }

  // Stop frame recording and get the buffer
  const frames = stopRecording();
  const end = frames.length > 0 ? frames[frames.length - 1].timestamp : _startTime;
  const durationMs = end - _startTime;
  const pollCount = frames.length;

  // Disconnect Long Task observer
  _disconnectLongTaskObserver();

  // Build report
  const interval = { start: _startTime, end, durationMs, pollCount, longTaskObserverActive: _longTaskObserverActive };
  _lastReport = buildReport(frames, interval, _longTasks);
  _longTasks = [];

  // Log the formatted report (one line per section) so the console
  // shows the concise summary rather than the full object dump.
  console.log(_lastReport.formatted);
}
