import { checkVictory } from '../game/state/world/victoryChecks.js';

import { refreshMap } from './mapRefresh.js';

import { bindLeftPanel } from '../ui/panels/leftPanel.js';
import { bindRightPanel } from '../ui/panels/rightPanel.js';

import { refreshHeader } from '../ui/panels/headerPanel.js';
import { showHeraldReport } from './heraldPrompt.js';
import { showDeathAnnouncement } from './deathAnnouncement.js';
import { showPendingDispatch } from './dispatchPrompt.js';
import { showPendingReward } from './rewardPrompt.js';
import { showVictory } from '../ui/hud.js';
import { applyTurnTint } from '../ui/turnTint.js';
import { runBot } from './botTurnRunner.js';
import { noteTurnStart } from './turnPacing.js';
import { G, currentChamp, isTurnLocked } from '../game/state/liveGame.js';
import { getClock } from '../shared/clockScheduler.js';
import { getCombatUI } from './combat/combatState.js';
import { startCombat } from './combat/index.js';
import { createDungeonBattle } from '../game/state/features/dungeonSystem.js';
import { getAnimatingIds } from '../render/hexmap3d/units/index.js';
import { startMeasure, endMeasure, setGameContext, clearGameContext } from '../devtools/performance/index.js';
import { BOT_AUTO_DELAY_MS } from '../params/ui/uiParams.js';

/**
 * Check whether any game modal is currently visible.
 * Uses computed display so any show mechanism (inline style, class, stylesheet)
 * is caught, not just inline `style="display: flex"`.
 */
export function anyModalOpen() {
  return Array.from(document.querySelectorAll('.modal'))
    .some(m => getComputedStyle(m).display !== 'none');
}

/**
 * Handle of the currently scheduled bot auto-turn task. Kept so a repeat
 * refreshAll (e.g. the modalClosed re-entry) replaces the pending task
 * instead of stacking a second runBot behind it.
 */
let _pendingBotTaskId = null;

// ---- Central render orchestrator ----

export function refreshAll() {
  startMeasure('refreshAll');

  if (!G) {
    console.warn('[refreshAll] G is null/undefined — bailing');
    clearGameContext();
    endMeasure('refreshAll');
    return;
  }

  const ch = currentChamp();

  // ── Turn chrome tint: whose turn is it? Drives header, panels, modals ──
  applyTurnTint(G);

  // ── Turn pacing: stamp when the active champion changes (bot dwell) ──
  noteTurnStart(G);

  // Set profiling context based on current game phase
  if (G.winnerId) {
    setGameContext({ phase: 'idle', detail: 'game_over' });
  } else if (getCombatUI()) {
    setGameContext({
      phase: 'combat',
      championId: ch ? ch.id : undefined,
      championName: ch ? ch.name : undefined,
      controller: ch ? ch.controller : undefined,
      action: 'in_progress',
    });
  } else if (ch && ch.controller === 'human' && !isTurnLocked()) {
    setGameContext({
      phase: 'human_turn',
      championId: ch.id,
      championName: ch.name,
      controller: 'human',
      action: getAnimatingIds().size > 0 ? 'moving' : 'idle',
    });
  } else if (ch && ch.controller === 'bot') {
    setGameContext({
      phase: 'bot_turn',
      championId: ch.id,
      championName: ch.name,
      controller: 'bot',
      action: isTurnLocked() ? 'locked' : 'pending',
    });
  } else if (isTurnLocked()) {
    setGameContext({ phase: 'transition', detail: 'turn_locked' });
  } else if (!ch) {
    setGameContext({ phase: 'idle', detail: 'no_active_champion' });
  } else {
    // Catch-all for any uncovered state
    setGameContext({ phase: ch ? ch.controller + '_turn' : 'unknown', detail: 'fallback' });
  }

  // ── Header (pure DOM update via headerPanel) ──
  startMeasure('dom:header');
  refreshHeader(G);
  endMeasure('dom:header');

  // Panels
  startMeasure('dom:leftPanel');
  bindLeftPanel(G);
  endMeasure('dom:leftPanel');

  startMeasure('dom:rightPanel');
  bindRightPanel(G);
  endMeasure('dom:rightPanel');

  // ── Map (3D replacement) ──
  refreshMap();

  // ── Death Announcement: shown before anything else ──
  if (showDeathAnnouncement(G)) { endMeasure('refreshAll'); return; }

  // ── Herald's Prognosis: shown at day start before any dispatch ──
  if (showHeraldReport(G)) { endMeasure('refreshAll'); return; }

  // ── Augur's Dispatch: the first interactive element of a human turn ──
  // While a dispatch is pending, reward prompts and bot turns wait for the
  // Acknowledge click (which re-enters refreshAll after clearing it).
  if (showPendingDispatch(G)) { endMeasure('refreshAll'); return; }

  // Show pending reward modal (artifact draft, dig loot, combat spoils, etc.)
  showPendingReward(G);

  // ── Dungeon days 2/3: an in-dungeon human champion is pulled straight into
  // their next battle at the start of the turn (day 1 entry is triggered by
  // arrival, then flows through here for battle 1 too). No world-map
  // interaction happens first — the combat modal owns the turn until it
  // resolves (win → day advance / completion; flee → eject + turn end).
  if (
    ch &&
    ch.controller === 'human' &&
    ch.dungeon &&
    !G.winnerId &&
    !getCombatUI() &&
    !anyModalOpen()
  ) {
    startCombat(ch, createDungeonBattle(G, ch));
    endMeasure('refreshAll');
    return;
  }

  // Bot auto-turn: skip if any modal is open, a turn is locked, or combat is active
  if (
    ch &&
    ch.controller === 'bot' &&
    !G.reward &&
    !G.winnerId &&
    !isTurnLocked() &&
    !getCombatUI() &&
    !anyModalOpen()
  ) {
    // Dev tools step-through guard — don't auto-schedule if step mode is on
    if (window.__devTools && window.__devTools.stepMode) {
      endMeasure('refreshAll');
      return;
    }
    // Replace any still-pending task rather than stacking runners
    if (_pendingBotTaskId !== null) getClock().clearTimeout(_pendingBotTaskId);
    const taskId = getClock().setTimeout(runBot, BOT_AUTO_DELAY_MS, 'bot');
    _pendingBotTaskId = taskId;
    // Expose task ID for dev tools Stop button (avoids circular import)
    if (window.__devTools) {
      window.__devTools._pendingBotTaskId = taskId;
    }
  }

  // Victory check
  checkVictory(G);
  if (G.winnerId) showVictory(G);

  endMeasure('refreshAll');
}
