/**
 * devBotControl.js — Bot control panel for the dev tools.
 *
 * Provides:
 *  - Champion controller toggle (human <-> bot)
 *  - Step-through mode: run one bot decision at a time
 *  - Play/Stop auto-advance for bot turns
 *
 * Layer: dev/ — imports game/state, runtime, ui modules.
 */

import { G, currentChamp } from '../game/state/liveGame.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { refreshAll } from '../runtime/refreshAll.js';
import { runBot } from '../runtime/turnPipeline.js';
import { getClock } from '../shared/clockScheduler.js';
import { toast } from '../ui/hud.js';

// ─── Dev state ─────────────────────────────────────────────────────────────

export const botDevState = {
  stepMode: false,
};

// ─── Champion list rendering ───────────────────────────────────────────────

/**
 * Rebuild the champion list in the Bot Control tab.
 * Shows each champion with a controller toggle button.
 */
export function renderChampionList() {
  const container = document.querySelector('.devtools__champ-list');
  if (!container || !G) return;

  container.replaceChildren();
  for (const ch of G.champions) {
    if (!ch.alive) continue;
    const fac = FACTIONS[ch.faction];
    const row = document.createElement('div');
    row.className = 'devtools__champ-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'devtools__champ-name';
    const dot = document.createElement('span');
    dot.className = 'devtools__champ-dot';
    dot.style.background = fac.color;
    nameSpan.appendChild(dot);
    nameSpan.append(` ${ch.name}`);

    const btn = document.createElement('button');
    btn.className = 'devtools__champ-ctrl-btn';
    btn.textContent = ch.controller === 'human' ? 'Human' : 'Bot';
    btn.dataset.champId = ch.id;
    btn.addEventListener('click', () => _toggleController(ch.id));

    row.appendChild(nameSpan);
    row.appendChild(btn);
    container.appendChild(row);
  }
}

// ─── Controller toggle ─────────────────────────────────────────────────────

function _toggleController(champId) {
  if (!G) return;
  const ch = G.champions.find(c => c.id === champId);
  if (!ch) return;
  ch.controller = ch.controller === 'human' ? 'bot' : 'human';
  toast(`${ch.name} is now ${ch.controller}`);
  renderChampionList();
  // The next refreshAll() will pick up the new controller
}

// ─── Step mode toggle ──────────────────────────────────────────────────────

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

/** Guard: prevent stepping while a bot action is still in flight. */
let _stepping = false;

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

// ─── Auto-advance Play/Stop ────────────────────────────────────────────────

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


