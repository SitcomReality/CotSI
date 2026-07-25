/**
 * frameProfiler.js — Per-frame ring-buffer recording.
 *
 * Hooks into frameTracker.onFrame() to record every frame during a
 * capture session. Captures frame time, FPS, game context, measurement
 * EMAs, and memory in a single pass.
 *
 * Layer: dev/ — depends on frameTracker, measurements, gameContext.
 */

import { getFps, getLastFrameTime, getFrameHistory, onFrame as registerFrameCallback } from './frameTracker.js';
import { getRawMeasurements } from './measurements.js';
import { getGameContext } from './gameContext.js';

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {Array<FrameEntry>|null} */
let _buffer = null;

/** @type {number|null} Max frames to keep (-1 = unlimited) */
let _maxFrames = null;

/** @type {(() => void)|null} deregistration for the onFrame callback */
let _deregister = null;

/** @type {number} Start timestamp (performance.now) */
let _startTime = 0;

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
  _deregister = registerFrameCallback(_recordFrame);

  // Immediately capture the first frame so there's data even for short captures.
  // This mirrors the old polling approach's _poll() on startCapture().
  _recordFrame(performance.now());

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

  // Frame data (fast — already computed by frameTracker)
  const frameTime = getLastFrameTime();
  const fps = getFps();

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

  const entry = { timestamp, frameTime, fps, context: ctx, measurements: measSnapshot, memory };

  _buffer.push(entry);

  // Trim to maxFrames periodically to avoid O(n) splice on every frame.
  // The +100 tolerance means at most 100 O(n) shifts per capture session.
  if (_maxFrames > 0 && _buffer.length > _maxFrames + 100) {
    _buffer.splice(0, _buffer.length - _maxFrames);
  }
}

/**
 * @typedef {Object} FrameEntry
 * @property {number} timestamp
 * @property {number} frameTime
 * @property {number} fps
 * @property {import('./gameContext.js').GameContext|null} context
 * @property {Object<string, { ema: number, avg: number, count: number, total: number }>} measurements
 * @property {{ usedJSHeapSize: number, totalJSHeapSize: number, jsHeapSizeLimit: number }|null} memory
 */
