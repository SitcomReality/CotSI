import { checkVictory } from '../victory.js';

import { refreshMap } from './mapRefresh.js';

import { bindLeftPanel } from '../../ui/panels/bindLeftPanel.js';
import { bindRightPanel } from '../../ui/panels/bindRightPanel.js';

import { refreshHeader } from '../../ui/bindHeader.js';
import { showPendingReward } from './rewardPrompt.js';
import { showVictory } from '../../ui/hud.js';
import { refreshZoomDisplay } from '../../ui/mapView.js';
import { runBot } from '../turnController.js';
import { G, currentChamp } from './liveGame.js';

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) return;

  window.__gameState = G;

  const ch = currentChamp();

  // ── Header (pure DOM update via bindHeader) ──
  refreshHeader(G);

  // Panels
  bindLeftPanel(G);
  bindRightPanel(G);

  // ── Map (3D replacement) ──
  refreshMap();

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
