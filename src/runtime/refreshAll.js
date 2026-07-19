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
  if (!G) return;

  window.__gameState = G;

  const ch = currentChamp();

  // ── Header (pure DOM update via headerPanel) ──
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
