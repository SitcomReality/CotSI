/**
 * botControl/autoPlay.js — Auto-advance play/stop controls for bot turns.
 *
 * Layer: dev/ — imports runtime, shared.
 */

import { refreshAll } from '../../runtime/refreshAll.js';
import { getClock } from '../../shared/clockScheduler.js';
import { toast } from '../../ui/hud.js';
import { botDevState } from './state.js';
import { toggleStepMode } from './stepMode.js';

export function autoPlay() {
  botDevState.stepMode = false;
  if (window.__devTools) window.__devTools.stepMode = false;
  _updateStepUI();

  // Disable Play, enable Stop
  const playBtn = document.getElementById('devBotAutoPlayBtn');
  const stopBtn = document.getElementById('devBotAutoStopBtn');
  if (playBtn) playBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  toast('Auto-play ON');
  // Trigger refreshAll which will pick up the controller and auto-schedule bots
  refreshAll();
}

export function autoStop() {
  // Cancel any pending bot timeout
  const taskId = (window.__devTools && window.__devTools._pendingBotTaskId) || null;
  if (taskId !== null) {
    getClock().clearTimeout(taskId);
    window.__devTools._pendingBotTaskId = null;
  }

  botDevState.stepMode = true;
  if (window.__devTools) window.__devTools.stepMode = true;
  _updateStepUI();

  // Enable Play, disable Stop
  const playBtn = document.getElementById('devBotAutoPlayBtn');
  const stopBtn = document.getElementById('devBotAutoStopBtn');
  if (playBtn) playBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  toast('Auto-play STOPPED');
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
