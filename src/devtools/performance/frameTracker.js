/**
 * frameTracker.js — Per-frame FPS and frame-time tracking.
 *
 * Owns FPS history and the frame callback. No DOM, no measurement logic.
 *
 * Layer: dev/ — depends on clockScheduler.
 */

import { FPS_SAMPLE_WINDOW, FPS_HISTORY_MAX } from '../../params/devtools/performanceParams.js';
import { getClock } from '../../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _fpsHistory = [];
let _lastFrameTime = 0;
let _previousTick = 0;
let _deregisterTick = null;

/** @type {Array<{ id: number, fn: (timestamp: number) => void, cancelled: boolean }>} */
let _perFrameCallbacks = [];
let _callbackIdCounter = 1;

const FPS_SAMPLES = FPS_SAMPLE_WINDOW;

// ─── Public API ────────────────────────────────────────────────────────────

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
 * Return a copy of the raw frame-timestamp history array.
 * Used by frameProfiler to read the current rolling FPS sample window.
 * @returns {number[]}
 */
export function getFrameHistory() {
  return _fpsHistory.slice();
}

/**
 * Ensure the frame tracker is running. Idempotent.
 */
export function ensureFrameTracking() {
  if (!_deregisterTick) {
    _deregisterTick = getClock().onTick(_onFrame);
  }
}

/**
 * Dispose frame tracking state.
 */
export function disposeFrameTracker() {
  if (_deregisterTick) {
    _deregisterTick();
    _deregisterTick = null;
  }
  _fpsHistory = [];
  _lastFrameTime = 0;
  _previousTick = 0;
  _perFrameCallbacks = [];
}

// ─── Frame callback ────────────────────────────────────────────────────────

function _onFrame(timestamp) {
  if (_previousTick > 0) {
    _lastFrameTime = timestamp - _previousTick;
  }
  _previousTick = timestamp;
  _fpsHistory.push(timestamp);
  if (_fpsHistory.length > FPS_HISTORY_MAX) {
    _fpsHistory = _fpsHistory.slice(-FPS_SAMPLES);
  }

  // Fire internal per-frame callbacks (frameProfiler, etc.) after state update
  // so they see the latest frameTime / FPS values.
  for (const cb of _perFrameCallbacks) {
    if (!cb.cancelled) {
      try { cb.fn(timestamp); } catch (err) {
        console.error('[frameTracker] per-frame callback error:', err);
      }
    }
  }
}

/**
 * Register a callback to run each frame after the tracker's internal state
 * has been updated. Callbacks receive the rAF timestamp.
 * @param {(timestamp: number) => void} fn
 * @returns {() => void} deregistration function
 */
export function onFrame(fn) {
  const id = _callbackIdCounter++;
  _perFrameCallbacks.push({ id, fn, cancelled: false });
  return function deregister() {
    for (const cb of _perFrameCallbacks) {
      if (cb.id === id) {
        cb.cancelled = true;
        return;
      }
    }
  };
}
