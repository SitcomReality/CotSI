/**
 * actionWiring/performance.js — Register data-action handlers for performance tab.
 *
 * Layer: dev/ — wires performance and shared.
 */

import { registerAction } from '../../shared/actionBus.js';
import { setOverlayEnabled, setMeasurementEnabled } from '../performance/index.js';

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
}
