/**
 * frameTracker.js — Per-frame FPS and frame-time tracking.
 *
 * Owns FPS history and the frame callback. No DOM, no measurement logic.
 *
 * Layer: dev/ — depends on clockScheduler.
 */

import { getClock } from '../../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _fpsHistory = [];
let _lastFrameTime = 0;
let _previousTick = 0;
let _deregisterTick = null;

const FPS_SAMPLES = 30;

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
}

// ─── Frame callback ────────────────────────────────────────────────────────

function _onFrame(timestamp) {
  if (_previousTick > 0) {
    _lastFrameTime = timestamp - _previousTick;
  }
  _previousTick = timestamp;
  _fpsHistory.push(timestamp);
  if (_fpsHistory.length > FPS_SAMPLES * 2) {
    _fpsHistory = _fpsHistory.slice(-FPS_SAMPLES);
  }
}

/**
 * Register an external callback to be invoked each frame after tracking updates.
 * Currently unused but available for overlay rendering or other per-frame consumers.
 * @param {(timestamp: number) => void} fn
 * @returns {() => void} deregistration function
 */
export function onFrame(fn) {
  // We attach to the tick deregistration chain by wrapping _onFrame.
  // Since _onFrame is already registered via getClock().onTick, we provide
  // a separate registration that runs from the overlay module instead.
  return getClock().onTick(fn);
}
