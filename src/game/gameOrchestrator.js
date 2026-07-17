import { checkVictory } from './victory.js';

import { refreshMap } from './session/mapRefresh.js';

import { renderLeftPanel, renderRightPanel } from '../ui/panels/panels-index.js';
import { refreshHeader } from '../ui/bindHeader.js';
import { initHeptagramWidget } from '../ui/heptagramWidget.js';
import { showPendingReward } from './session/rewardPrompt.js';
import { showVictory } from '../ui/hud.js';
import { refreshZoomDisplay } from '../ui/mapView.js';
import { runBot } from './turnController.js';
import { G, currentChamp } from './session/liveGame.js';

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) return;

  window.__gameState = G;

  const ch = currentChamp();

  // ── Header (pure DOM update via bindHeader) ──
  refreshHeader(G);

  // Panels
  document.getElementById('championCard').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightPanel').innerHTML = renderRightPanel(G);

  // ── Map (3D replacement) ──
  refreshMap();

  // Paley widget
  initHeptagramWidget('paleyMount');

  // HUD
  if (ch) {
    refreshZoomDisplay();
  }

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


