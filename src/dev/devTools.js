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
import { registerAction } from '../shared/actionBus.js';
import { getClock } from '../shared/clockScheduler.js';
import {
  cheatGold10,
  cheatHp50,
  cheatHpFull,
  cheatRelic1,
  cheatKnot5,
  cheatPotencyAll,
  cheatFillMoves,
  cheatTeleport,
  teleportToHex,
  cheatCombatDamage,
  cheatCombatWin,
  cheatRevealFog,
  devState,
} from './devCheats.js';
import {
  setMeasurementEnabled,
  setOverlayEnabled,
  getMeasurementStats,
  getFps,
  getLastFrameTime,
  ensureFrameTracking,
} from './devPerformance.js';
import {
  renderChampionList,
  toggleStepMode,
  stepOnce,
  autoPlay,
  autoStop,
  botDevState,
} from './devBotControl.js';
import { G } from '../game/state/liveGame.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { moveChampion } from '../game/state/championMovement.js';
import { refreshAll } from '../runtime/refreshAll.js';

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

function _registerCheatActions() {
  registerAction('dev:cheat:gold10', cheatGold10);
  registerAction('dev:cheat:hp50', cheatHp50);
  registerAction('dev:cheat:hpFull', cheatHpFull);
  registerAction('dev:cheat:relic1', cheatRelic1);
  registerAction('dev:cheat:knot5', cheatKnot5);
  registerAction('dev:cheat:potencyAll', cheatPotencyAll);
  registerAction('dev:cheat:fillMoves', cheatFillMoves);
  registerAction('dev:cheat:teleport', cheatTeleport);

  registerAction('dev:cheat:revealFog', () => {
    cheatRevealFog();
    refreshAll();
  });

  registerAction('dev:cheat:combatDamage', () => {
    const input = document.getElementById('devCombatDmgInput');
    const amount = input ? parseInt(input.value, 10) : 20;
    cheatCombatDamage(amount);
  });

  registerAction('dev:cheat:combatWin', cheatCombatWin);
}

function _registerPerfActions() {
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

  // Toggle individual measurements via checkbox (data-action on label,
  // so clicking the label text works — find the checkbox inside)
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

function _registerBotActions() {
  registerAction('dev:bot:stepMode', toggleStepMode);
  registerAction('dev:bot:stepOnce', stepOnce);
  registerAction('dev:bot:autoPlay', autoPlay);
  registerAction('dev:bot:autoStop', autoStop);
}

function _registerTabActions() {
  registerAction('dev:switchTab', (el) => {
    _switchTab(el.dataset.tab);
  });
}

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

  // Register all actions
  _registerCheatActions();
  _registerPerfActions();
  _registerBotActions();
  _registerTabActions();

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
