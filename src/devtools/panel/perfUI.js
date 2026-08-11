/**
 * panel/perfUI.js — Dev tools performance tab UI refresh.
 *
 * Handles polling updates for the FPS display and measurement values
 * shown in the Performance tab of the dev panel.
 *
 * Layer: dev/ — imports performance/ and shared.
 */

import { PERF_POLL_INTERVAL_MS } from '../../params/devtools/performanceParams.js';
import { getFps, getLastFrameTime, ensureFrameTracking } from '../performance/index.js';
import { getMeasurementStats, setMeasurementEnabled } from '../performance/index.js';
import { getClock } from '../../shared/clockScheduler.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _perfIntervalId = null;

// ─── Public API ────────────────────────────────────────────────────────────

export function refreshPerfStats() {
  // Update FPS display
  const fpsEl = document.getElementById('devPerfFps');
  const frameEl = document.getElementById('devPerfFrameTime');
  if (fpsEl) fpsEl.textContent = getFps().toFixed(1);
  if (frameEl) frameEl.textContent = getLastFrameTime().toFixed(1);

  // Update measurement displays
  const names = ['refreshAll', 'mapRefresh', 'runBot', 'combatFlow', 'render3d', 'overlays', 'animMove'];
  for (const name of names) {
    const id = 'devPerf' + name.charAt(0).toUpperCase() + name.slice(1);
    const el = document.getElementById(id);
    if (!el) continue;
    const stats = getMeasurementStats(name);
    if (stats && stats.count > 0) {
      el.textContent = `${stats.ema.toFixed(2)}ms (${stats.count})`;
    } else {
      el.textContent = '\u2014';
    }
  }
}

export function startPerfPolling() {
  if (_perfIntervalId) return;
  _perfIntervalId = getClock().setInterval(refreshPerfStats, PERF_POLL_INTERVAL_MS, 'ui');
}

export function stopPerfPolling() {
  if (_perfIntervalId) {
    getClock().clearInterval(_perfIntervalId);
    _perfIntervalId = null;
  }
}
