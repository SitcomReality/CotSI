/**
 * frameProfiler.js — Per-frame ring-buffer recording.
 *
 * Hooks into frameTracker.onFrame() to record every frame during a
 * capture session. Captures frame time, FPS, game context, measurement
 * EMAs, and memory in a single pass.
 *
 * Layer: dev/ — depends on frameTracker, measurements, gameContext.
 */

import { getFps, getLastFrameTime, getFrameHistory, onFrame as registerFrameCallback, ensureFrameTracking } from './frameTracker.js';
import { getRawMeasurements, startFrameSnapshot, endFrameDeltas, startMeasure, endMeasure } from './measurements.js';
import { getGameContext } from './gameContext.js';
import { getClock } from '../../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {Array<FrameEntry>|null} */
let _buffer = null;

/** @type {number|null} Max frames to keep (-1 = unlimited) */
let _maxFrames = null;

/** @type {(() => void)|null} deregistration for the onFrame callback */
let _deregister = null;

/** @type {number} Start timestamp (performance.now) */
let _startTime = 0;

/** @type {number} TARGET frame time for 60fps */
const TARGET_FRAME_MS = 1000 / 60; // 16.67

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start recording per-frame data.
 * The recording is stored in a ring buffer and can be retrieved via stopRecording().
 * @param {number} [maxFrames=18000] — max frames to keep (5 min @ 60fps). Pass -1 for unlimited.
 * @returns {{ started: boolean, message: string }}
 */
export function startRecording(maxFrames = 18000) {
  if (_deregister) {
    return { started: false, message: 'Recording is already active. Call stopRecording() first.' };
  }

  _buffer = [];
  _maxFrames = maxFrames;
  _startTime = performance.now();
  ensureFrameTracking();

  // Initialize frame-delta snapshot so the first frame records from a clean baseline
  startFrameSnapshot();

  // Register a frame marker that wraps the entire clock tick (timeout dispatch,
  // frame callbacks, clock advancement) so we can measure overhead between
  // the named per-frame spans.
  getClock().setFrameMarker((phase) => {
    if (phase === 'start') {
      startMeasure('frame:tick');
    } else {
      endMeasure('frame:tick');
    }
  });

  _deregister = registerFrameCallback(_recordFrame);

  return { started: true, message: `Frame recording started (maxFrames=${maxFrames})` };
}

/**
 * Stop recording and return the captured frame entries.
 * @returns {FrameEntry[]}
 */
export function stopRecording() {
  if (_deregister) {
    _deregister();
    _deregister = null;
  }

  // Unregister the tick-level frame marker
  getClock().setFrameMarker(null);

  const result = _buffer || [];
  _buffer = null;
  _maxFrames = null;
  _startTime = 0;
  return result;
}

/**
 * Check whether recording is currently active.
 * @returns {boolean}
 */
export function isRecording() {
  return _deregister !== null;
}

/**
 * Get the start timestamp of the current recording, or 0 if not recording.
 * @returns {number}
 */
export function getRecordingStart() {
  return _startTime;
}

// ─── Internal ──────────────────────────────────────────────────────────────

/**
 * Capture a single frame entry — runs every rAF during recording.
 * Lightweight: snapshots memory references rather than deep-cloning.
 * @param {number} timestamp — rAF timestamp
 */
function _recordFrame(timestamp) {
  if (!_buffer) return;

  // Profile the profiler's own cost
  const _startTime = performance.now();

  // ── Compute per-frame measurement deltas ──
  // endFrameDeltas() returns measurements that completed between the
  // previous startFrameSnapshot() call and now — i.e., work done
  // during the previous frame interval.
  const spanDeltas = endFrameDeltas();

  // Convert deltas to a flat span array for this frame
  const spans = [];
  let jsWorkMs = 0;
  for (const [name, d] of Object.entries(spanDeltas)) {
    spans.push({ name, ms: d.deltaMs, count: d.deltaCount });
    jsWorkMs += d.deltaMs;
  }

  // Seed the next frame's baseline
  startFrameSnapshot();

  // Measure total JS execution time from tick start to now
  // This captures all JS work in the tick, including untimed code paths
  // that are invisible to the measurement system.
  const tickStart = getClock().getFrameTickStart();
  if (tickStart > 0) {
    const jsElapsed = performance.now() - tickStart;
    spans.push({ name: 'frameJs', ms: jsElapsed, count: 1 });
  }

  // ── Frame data (fast — already computed by frameTracker) ──
  const frameTime = getLastFrameTime();
  const fps = getFps();

  // Compute how many vsyncs were likely missed
  const missedVsyncs = frameTime > 0
    ? Math.max(0, Math.round(frameTime / TARGET_FRAME_MS) - 1)
    : 0;

  // Game context snapshot
  const ctx = getGameContext();

  // Measurement EMA snapshot — shallow-copy enabled measurement state
  const _measurements = getRawMeasurements();
  const measSnapshot = {};
  for (const [name, m] of Object.entries(_measurements)) {
    if (m.enabled && m.ema !== undefined) {
      measSnapshot[name] = {
        ema: m.ema,
        avg: m.count > 0 ? m.total / m.count : 0,
        count: m.count,
        total: m.total,
      };
    }
  }

  // Memory (Chrome-only, best-effort)
  let memory = null;
  if (performance.memory) {
    memory = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }

  // Profile the profiler's own cost
  spans.push({ name: 'recordFrame', ms: performance.now() - _startTime, count: 1 });

  const entry = {
    timestamp, frameTime, fps,
    context: ctx,
    spans: spans.length > 0 ? spans : undefined,
    jsWorkMs: jsWorkMs > 0 ? jsWorkMs : undefined,
    missedVsyncs: missedVsyncs > 0 ? missedVsyncs : undefined,
    measurements: measSnapshot,
    memory,
  };

  _buffer.push(entry);

  // Trim to maxFrames periodically to avoid O(n) splice on every frame.
  // The +100 tolerance means at most 100 O(n) shifts per capture session.
  if (_maxFrames > 0 && _buffer.length > _maxFrames + 100) {
    _buffer.splice(0, _buffer.length - _maxFrames);
  }
}

/**
 * @typedef {Object} FrameSpan
 * @property {string} name — measurement name
 * @property {number} ms — total ms accumulated in this span during the frame
 * @property {number} count — number of times the span was measured
 */

/**
 * @typedef {Object} FrameEntry
 * @property {number} timestamp
 * @property {number} frameTime
 * @property {number} fps
 * @property {import('./gameContext.js').GameContext} context
 * @property {FrameSpan[]} [spans] — per-frame measurement deltas (only if non-empty)
 * @property {number} [jsWorkMs] — sum of all measured span time in this frame
 * @property {number} [missedVsyncs] — estimated vsyncs skipped
 * @property {Object<string, { ema: number, avg: number, count: number, total: number }>} measurements
 * @property {{ usedJSHeapSize: number, totalJSHeapSize: number, jsHeapSizeLimit: number }|null} memory
 */
