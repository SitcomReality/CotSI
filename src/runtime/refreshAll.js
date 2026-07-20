import { checkVictory } from '../game/state/victoryChecks.js';

import { refreshMap } from './mapRefresh.js';

import { bindLeftPanel } from '../ui/panels/leftPanel.js';
import { bindRightPanel } from '../ui/panels/rightPanel.js';

import { refreshHeader } from '../ui/panels/headerPanel.js';
import { showHeraldReport } from './heraldPrompt.js';
import { showPendingDispatch } from './dispatchPrompt.js';
import { showPendingReward } from './rewardPrompt.js';
import { showVictory } from '../ui/hud.js';
import { refreshZoomDisplay } from '../ui/mapTooltip.js';
import { runBot } from './turnPipeline.js';
import { G, currentChamp, isTurnLocked } from '../game/state/liveGame.js';
import { getClock } from '../shared/clockScheduler.js';
import { getCombatUI } from '../ui/combat/combatUiState.js';

/**
 * Check whether any game modal is currently visible.
 */
function anyModalOpen() {
  return !!document.querySelector('.modal[style*="flex"]');
}

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) {
    console.warn('[refreshAll] G is null/undefined — bailing');
    return;
  }

  window.__gameState = G;

  const ch = currentChamp();

  // ── Header (pure DOM update via headerPanel) ──
  refreshHeader(G);

  // Panels
  bindLeftPanel(G);
  bindRightPanel(G);

  // ── Map (3D replacement) ──
  refreshMap();

  // ── Herald's Prognosis: shown at day start before any dispatch ──
  if (showHeraldReport(G)) return;

  // ── Augur's Dispatch: the first interactive element of a human turn ──
  // While a dispatch is pending, reward prompts and bot turns wait for the
  // Acknowledge click (which re-enters refreshAll after clearing it).
  if (showPendingDispatch(G)) return;

  // Show pending reward modal (artifact draft, dig loot, combat spoils, etc.)
  showPendingReward(G);

  // Bot auto-turn: skip if any modal is open, a turn is locked, or combat is active
  if (
    ch &&
    ch.controller === 'bot' &&
    !G.reward &&
    !G.notice &&
    !G.winnerId &&
    !isTurnLocked() &&
    !getCombatUI() &&
    !anyModalOpen()
  ) {
    getClock().setTimeout(runBot, 620, 'bot');
  }

  // Victory check
  checkVictory(G);
  if (G.winnerId) showVictory(G);
}
