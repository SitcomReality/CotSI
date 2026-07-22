/**
 * devActionWiring.js — Register all data-action handlers for the devTools panel.
 *
 * Layer: dev/ — orchestrates across game/state, runtime, ui, and render.
 */

import { registerAction } from '../shared/actionBus.js';
import {
  cheatGold10,
  cheatHp50,
  cheatHpFull,
  cheatRelic1,
  cheatKnot5,
  cheatPotencyAll,
  cheatFillMoves,
  cheatTeleport,
  cheatRevealFog,
  cheatCombatDamage,
  cheatCombatWin,
} from './devCheats.js';
import {
  setMeasurementEnabled,
  setOverlayEnabled,
} from './devPerformance.js';
import {
  toggleStepMode,
  stepOnce,
  autoPlay,
  autoStop,
} from './devBotControl.js';
import { refreshAll } from '../runtime/refreshAll.js';

// ─── Cheat actions ─────────────────────────────────────────────────────────

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

// ─── Performance actions ───────────────────────────────────────────────────

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

// ─── Bot control actions ───────────────────────────────────────────────────

function _registerBotActions() {
  registerAction('dev:bot:stepMode', toggleStepMode);
  registerAction('dev:bot:stepOnce', stepOnce);
  registerAction('dev:bot:autoPlay', autoPlay);
  registerAction('dev:bot:autoStop', autoStop);
}

// ─── Tab switching actions ─────────────────────────────────────────────────

function _registerTabActions(switchTab) {
  registerAction('dev:switchTab', (el) => {
    switchTab(el.dataset.tab);
  });
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Register all devTools data-action handlers.
 * @param {object} deps
 * @param {(tabName: string) => void} deps.switchTab - Tab-switching callback
 */
export function registerAllDevActions({ switchTab }) {
  _registerCheatActions();
  _registerPerfActions();
  _registerBotActions();
  _registerTabActions(switchTab);
}
