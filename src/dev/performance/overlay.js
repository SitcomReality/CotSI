/**
 * overlay.js — Live FPS/timing DOM overlay.
 *
 * Creates and updates a fixed-position overlay showing FPS, frame time,
 * and the top-5 slowest active measurements.
 *
 * Layer: dev/ — depends on frameTracker for FPS/frame data and
 * measurements for measurement data.
 */

import { OVERLAY_TOP_N } from '../../params/dev/performanceParams.js';
import { getFps, getLastFrameTime } from './frameTracker.js';
import { getRawMeasurements } from './measurements.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _overlayEnabled = false;
let _overlayEl = null;
let _deregisterTick = null;
import { getClock } from '../../shared/clockScheduler.js';

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Toggle the live FPS/timing overlay on/off.
 * @param {boolean} on
 */
export function setOverlayEnabled(on) {
  _overlayEnabled = on;

  if (on) {
    if (!_overlayEl) {
      _overlayEl = document.createElement('div');
      _overlayEl.className = 'devtools-perf-overlay';
      document.body.appendChild(_overlayEl);
    }
    _overlayEl.classList.add('is-visible');

    if (!_deregisterTick) {
      _deregisterTick = getClock().onTick(_updateOverlay);
    }
  } else {
    if (_overlayEl) {
      _overlayEl.classList.remove('is-visible');
    }
  }
}

/**
 * Clean up the overlay DOM.
 */
export function disposeOverlay() {
  if (_deregisterTick) {
    _deregisterTick();
    _deregisterTick = null;
  }
  if (_overlayEl) {
    _overlayEl.remove();
    _overlayEl = null;
  }
  _overlayEnabled = false;
}

// ─── Overlay rendering ─────────────────────────────────────────────────────

function _updateOverlay(timestamp) {
  const _measurements = getRawMeasurements();
  const fps = getFps();
  const frame = getLastFrameTime().toFixed(1);

  // Collect top-N measurements by EMA
  const entries = Object.entries(_measurements)
    .filter(([, m]) => m.enabled && m.ema !== undefined)
    .map(([name, m]) => ({ name, ema: m.ema }))
    .sort((a, b) => b.ema - a.ema)
    .slice(0, OVERLAY_TOP_N);

  let html = `FPS: ${fps.toFixed(1)}  Frame: ${frame}ms`;
  for (const e of entries) {
    html += `<br>${e.name}: ${e.ema.toFixed(2)}ms`;
  }
  _overlayEl.innerHTML = html;
}

/**
 * Check whether the overlay is currently enabled.
 * @returns {boolean}
 */
export function isOverlayEnabled() {
  return _overlayEnabled;
}
