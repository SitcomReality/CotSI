/**
 * devTools.js — Dev Tools panel entry point.
 *
 * Loads the devTools template, registers keyboard shortcuts, and wires
 * all data-action handlers for cheats, performance, and bot control tabs.
 *
 * Imported for side effects by bootstrap.js.
 *
 * Layer: dev/ — orchestrates across game/state, runtime, ui, and render.
 */

import { loadTemplate } from '../ui/templates/templateLoader.js';
import { getClock } from '../shared/clockScheduler.js';
import { teleportToHex, devState } from './devCheats.js';
import {
  setMeasurementEnabled,
  getMeasurementStats,
  getFps,
  getLastFrameTime,
  ensureFrameTracking,
} from './devPerformance.js';
import { renderChampionList } from './devBotControl.js';
import { refreshAll } from '../runtime/refreshAll.js';
import { registerAllDevActions } from './devActionWiring.js';

// ─── State ─────────────────────────────────────────────────────────────────

let _visible = false;
let _perfTickDeregister = null;

// Expose dev state globally for hexBridge.js and refreshAll.js
window.__devTools = devState;
window.__devTools.stepMode = false;

// ─── Template injection ────────────────────────────────────────────────────

async function _injectTemplate() {
  // Already injected?
  if (document.querySelector('.devtools-mount')) return;

  const mount = document.createElement('div');
  mount.className = 'devtools-mount';
  document.body.appendChild(mount);

  const { frag } = await loadTemplate('devTools');
  mount.appendChild(frag);
}

// ─── Keyboard shortcut ─────────────────────────────────────────────────────

function _onKeyDown(e) {
  // Backtick/grave key to toggle
  if (e.key === '`' || e.key === '~') {
    e.preventDefault();
    toggleDevTools();
    return;
  }
  // Escape exits teleport mode if active
  if (e.key === 'Escape' && devState.teleportMode) {
    devState.teleportMode = false;
    const btn = document.getElementById('devTeleportBtn');
    if (btn) {
      btn.textContent = 'Teleport Mode: OFF';
      btn.classList.remove('is-active');
    }
  }
}

function toggleDevTools() {
  _visible = !_visible;
  const mount = document.querySelector('.devtools-mount');
  if (!mount) return;
  mount.classList.toggle('is-visible', _visible);

  if (_visible) {
    // Refresh dynamic content when panel opens
    renderChampionList();
    _refreshPerfStats();
    // Ensure frame tracking is running for performance stats
    ensureFrameTracking();
  }
}

// ─── Tab switching ─────────────────────────────────────────────────────────

function _switchTab(tabName) {
  document.querySelectorAll('.devtools__tab').forEach(t =>
    t.classList.toggle('is-active', t.dataset.tab === tabName)
  );
  document.querySelectorAll('.devtools__body').forEach(b => {
    const targetId = 'devBody' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    b.classList.toggle('is-active', b.id === targetId);
  });
}

// ─── Performance stats refresh ─────────────────────────────────────────────

let _perfIntervalId = null;

function _refreshPerfStats() {
  // Update FPS display
  const fpsEl = document.getElementById('devPerfFps');
  const frameEl = document.getElementById('devPerfFrameTime');
  if (fpsEl) fpsEl.textContent = getFps().toFixed(1);
  if (frameEl) frameEl.textContent = getLastFrameTime().toFixed(1);

  // Update measurement displays
  const names = ['refreshAll', 'mapRefresh', 'runBot', 'combatFlow'];
  for (const name of names) {
    const el = document.getElementById(`devPerf${name.charAt(0).toUpperCase() + name.slice(1)}`);
    if (!el) continue;
    const stats = getMeasurementStats(name);
    if (stats && stats.count > 0) {
      el.textContent = `${stats.ema.toFixed(2)}ms (${stats.count})`;
    } else {
      el.textContent = '—';
    }
  }
}

function _startPerfPolling() {
  if (_perfIntervalId) return;
  _perfIntervalId = getClock().setInterval(_refreshPerfStats, 500, 'ui');
}

// ─── Action registrations ──────────────────────────────────────────────────
//
// All data-action handlers are registered in devActionWiring.js via
// registerAllDevActions().

// ─── Teleport mode: intercept hex clicks ───────────────────────────────────

/**
 * Called by hexBridge.js when a hex is clicked.
 * If teleport mode is active, teleports the champion there.
 * @param {{ q: number, r: number }} hex
 * @returns {boolean} true if the click was consumed by teleport
 */
export function handleTeleportClick(hex) {
  if (!devState.teleportMode) return false;
  teleportToHex(hex);
  refreshAll();
  return true;
}

// ─── Initialization ────────────────────────────────────────────────────────

let _initialized = false;

export async function initDevTools() {
  if (_initialized) return;
  _initialized = true;

  await _injectTemplate();

  // Keyboard listener
  window.addEventListener('keydown', _onKeyDown);

  // Register all data-action handlers
  registerAllDevActions({ switchTab: _switchTab });

  // Start performance polling
  _startPerfPolling();

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
