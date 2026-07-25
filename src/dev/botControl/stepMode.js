/**
 * botControl/stepMode.js — Step-through bot execution mode.
 *
 * Layer: dev/ — imports game/state, runtime, shared.
 */

import { G, currentChamp } from '../../game/state/liveGame.js';
import { runBot } from '../../runtime/botTurnRunner.js';
import { toast } from '../../ui/hud.js';
import { botDevState } from './state.js';

// ─── Guard ──────────────────────────────────────────────────────────────────

/** Guard: prevent stepping while a bot action is still in flight. */
let _stepping = false;

// ─── Step mode toggle ───────────────────────────────────────────────────────

export function toggleStepMode() {
  botDevState.stepMode = !botDevState.stepMode;
  // Sync to window.__devTools for refreshAll.js to check without circular import
  if (window.__devTools) {
    window.__devTools.stepMode = botDevState.stepMode;
  }
  _updateStepUI();
  if (botDevState.stepMode) {
    toast('Step mode ON');
  } else {
    toast('Step mode OFF');
  }
}

function _updateStepUI() {
  const btn = document.getElementById('devBotStepBtn');
  if (btn) {
    btn.textContent = botDevState.stepMode ? 'Step Mode: ON' : 'Step Mode: OFF';
    btn.classList.toggle('is-active', botDevState.stepMode);
  }
  const stepBtn = document.getElementById('devBotStepOnceBtn');
  if (stepBtn) stepBtn.disabled = !botDevState.stepMode;
}

// ─── Step once ─────────────────────────────────────────────────────────────

export async function stepOnce() {
  if (!botDevState.stepMode) {
    toast('Enable Step Mode first', true);
    return;
  }
  if (_stepping) {
    toast('Bot action still in progress…', true);
    return;
  }
  const ch = currentChamp();
  if (!ch || ch.controller !== 'bot') {
    toast('No bot champion active to step', true);
    return;
  }

  // Show a brief decision record
  const decisionEl = document.getElementById('devBotLastDecision');
  if (decisionEl) {
    decisionEl.textContent = 'Stepping…';
  }

  _stepping = true;
  try {
    await runBot();
  } catch (err) {
    console.error('[devBotControl] runBot threw:', err);
  } finally {
    _stepping = false;
  }

  // Update the last-decision display after the bot action completes
  _updateLastDecision();
}

function _updateLastDecision() {
  const decisionEl = document.getElementById('devBotLastDecision');
  if (!decisionEl) return;
  const ch = currentChamp();
  if (!ch) {
    decisionEl.textContent = 'No active champion';
    return;
  }
  if (ch.controller === 'human') {
    decisionEl.textContent = `${ch.name} — human turn started`;
  } else {
    decisionEl.textContent = `${ch.name} — bot, ready to step`;
  }
}
