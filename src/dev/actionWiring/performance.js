/**
 * actionWiring/performance.js — Register data-action handlers for performance tab.
 *
 * Layer: dev/ — wires performance and shared.
 */

import { registerAction } from '../../shared/actionBus.js';
import { setOverlayEnabled, setMeasurementEnabled, startCapture, stopCapture, isCaptureActive, getCaptureReport } from '../performance/index.js';

export function registerPerfActions() {
  registerAction('dev:perf:toggleOverlay', () => {
    const btn = document.getElementById('devPerfOverlayBtn');
    const current = btn?.classList.contains('is-active') || false;
    const next = !current;
    setOverlayEnabled(next);
    if (btn) {
      btn.textContent = next ? 'Live Overlay: ON' : 'Live Overlay: OFF';
      btn.classList.toggle('is-active', next);
    }
  });

  // Toggle individual measurements via checkbox
  registerAction('dev:perf:toggle:refreshAll', (el) => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) setMeasurementEnabled('refreshAll', cb.checked);
  });
  registerAction('dev:perf:toggle:mapRefresh', (el) => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) setMeasurementEnabled('mapRefresh', cb.checked);
  });
  registerAction('dev:perf:toggle:runBot', (el) => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) setMeasurementEnabled('runBot', cb.checked);
  });
  registerAction('dev:perf:toggle:combatFlow', (el) => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) setMeasurementEnabled('combatFlow', cb.checked);
  });

  // Capture controls
  registerAction('dev:perf:startCapture', () => {
    if (isCaptureActive()) return;
    const result = startCapture();
    if (result.started) {
      document.getElementById('devPerfCaptureStart').disabled = true;
      document.getElementById('devPerfCaptureStop').disabled = false;
      document.getElementById('devPerfCaptureStatus').textContent = 'Recording\u2026';
    }
  });

  registerAction('dev:perf:stopCapture', () => {
    if (!isCaptureActive()) return;
    const report = stopCapture();
    document.getElementById('devPerfCaptureStart').disabled = false;
    document.getElementById('devPerfCaptureStop').disabled = true;
    const status = document.getElementById('devPerfCaptureStatus');
    status.textContent = `Done: ${report.formatted.split('\n')[0]}`;
  });

  registerAction('dev:perf:copyReport', () => {
    const report = getCaptureReport();
    if (!report) {
      const status = document.getElementById('devPerfCaptureStatus');
      status.textContent = 'No report available. Start and stop a capture first.';
      return;
    }
    navigator.clipboard.writeText(report.formatted).then(() => {
      document.getElementById('devPerfCaptureStatus').textContent = 'Report copied to clipboard!';
    }).catch(() => {
      document.getElementById('devPerfCaptureStatus').textContent = 'Failed to copy report.';
    });
  });
}
