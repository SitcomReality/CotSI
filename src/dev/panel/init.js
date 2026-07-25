/**
 * panel/init.js — Dev tools panel initialization and toggle.
 *
 * Orchestrates template injection, keyboard binding, tab switching,
 * performance UI polling, and action registration.
 *
 * Layer: dev/ — orchestrates across game/state, runtime, ui, and render.
 */

import { injectTemplate } from './template.js';
import { registerKeyboard } from './keyboard.js';
import { switchTab } from './tabs.js';
import { refreshPerfStats, startPerfPolling } from './perfUI.js';
import { renderChampionList } from '../botControl/index.js';
import { ensureFrameTracking, setMeasurementEnabled } from '../performance/index.js';
import { registerAllDevActions } from '../actionWiring/index.js';
import { devState } from '../cheats/state.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _visible = false;
let _initialized = false;

// Expose dev state globally for hexBridge.js and refreshAll.js
window.__devTools = devState;
window.__devTools.stepMode = false;

// ─── Toggle ─────────────────────────────────────────────────────────────────

function toggleDevTools() {
  _visible = !_visible;
  const mount = document.querySelector('.devtools-mount');
  if (!mount) return;
  mount.classList.toggle('is-visible', _visible);

  if (_visible) {
    // Refresh dynamic content when panel opens
    renderChampionList();
    refreshPerfStats();
    // Ensure frame tracking is running for performance stats
    ensureFrameTracking();
  }
}

// ─── Initialization ─────────────────────────────────────────────────────────

export async function initDevTools() {
  if (_initialized) return;
  _initialized = true;

  await injectTemplate();

  // Keyboard listener (backtick to toggle, escape to cancel teleport)
  registerKeyboard(toggleDevTools);

  // Register all data-action handlers
  registerAllDevActions({ switchTab });

  // Start performance polling
  startPerfPolling();

  // Enable refreshAll measurement by default
  setMeasurementEnabled('refreshAll', true);

  console.log('[devTools] Dev tools initialized. Press ` to toggle.');
}

// Side-effect: auto-init on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDevTools);
} else {
  initDevTools();
}
