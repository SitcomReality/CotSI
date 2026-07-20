import { checkVictory } from '../game/state/victoryChecks.js';

import { refreshMap } from './mapRefresh.js';

import { bindLeftPanel } from '../ui/panels/leftPanel.js';
import { bindRightPanel } from '../ui/panels/rightPanel.js';

import { refreshHeader } from '../ui/panels/headerPanel.js';
import { showPendingDispatch } from './dispatchPrompt.js';
import { showPendingReward } from './rewardPrompt.js';
import { showVictory } from '../ui/hud.js';
import { refreshZoomDisplay } from '../ui/mapTooltip.js';
import { runBot } from './turnPipeline.js';
import { G, currentChamp } from '../game/state/liveGame.js';

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) {
    console.warn('[refreshAll] G is null/undefined — bailing');
    return;
  }

  window.__gameState = G;

  const ch = currentChamp();
  console.log('[refreshAll] running — day:', G.day, 'champ:', ch?.name, 'controller:', ch?.controller);

  // Debug: check key DOM elements exist
  const debugEls = {
    game: document.getElementById('game'),
    setup: document.getElementById('setup'),
    championCard: document.getElementById('championCard'),
    mapMount: document.getElementById('mapMount'),
    paleyMount: document.getElementById('paleyMount'),
    rightPanel: document.getElementById('rightPanel'),
    gameHeader: document.getElementById('gameHeader'),
    logEntries: document.querySelector('.rt-log-entries'),
  };
  for (const [k, v] of Object.entries(debugEls)) {
    if (!v) console.warn('[refreshAll] MISSING element:', k);
  }
  if (debugEls.game) {
    const rect = debugEls.game.getBoundingClientRect();
    console.log('[refreshAll] #game rect:', rect.width + 'x' + rect.height, 'display:', getComputedStyle(debugEls.game).display);
  }
  if (debugEls.mapMount) {
    const rect = debugEls.mapMount.getBoundingClientRect();
    console.log('[refreshAll] #mapMount rect:', rect.width + 'x' + rect.height);
  }

  // ── Header (pure DOM update via headerPanel) ──
  refreshHeader(G);

  // Panels
  bindLeftPanel(G);
  bindRightPanel(G);

  // ── Map (3D replacement) ──
  refreshMap();

  // ── Augur's Dispatch: the first interactive element of a human turn ──
  // While a dispatch is pending, reward prompts and bot turns wait for the
  // Acknowledge click (which re-enters refreshAll after clearing it).
  if (showPendingDispatch(G)) return;

  // Show pending reward modal (artifact draft, dig loot, combat spoils, etc.)
  showPendingReward(G);

  // Bot auto-turn (skip if any modal open)
  if (
    ch &&
    ch.controller === 'bot' &&
    !G.reward &&
    !G.notice &&
    !G.winnerId
  ) {
    setTimeout(runBot, 620);
  }

  // Victory check
  checkVictory(G);
  if (G.winnerId) showVictory(G);
}
