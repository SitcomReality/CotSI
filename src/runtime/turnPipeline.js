/**
 * turnPipeline.js — Turn-advancement and bot decision execution.
 * Orchestrates game/state mutations with UI/render refreshes.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp, setTurnLock, isTurnLocked } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { finishTurn } from '../game/state/worldSimulation.js';
import { isDigEligible } from '../game/state/turnActions.js';
import { moveChampion, movementRange } from '../game/state/championMovement.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { startCombat } from '../ui/combat/combatModal.js';
import { resolveCombatSilently } from '../game/state/combat/combatAutoResolve.js';
import { toast } from '../ui/hud.js';
import { openConfirmModal } from '../ui/modals/confirmModal.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { runBotTurn as aiDecide } from '../game/state/championAI.js';
import { getClock } from '../shared/clockScheduler.js';
import { showBotIndicator, hideBotIndicator } from '../ui/panels/botIndicator.js';

/**
 * Disable or re-enable the End Turn button with visual feedback.
 */
function disableEndTurnBtn(disabled) {
  const btn = document.querySelector('.left-endturn-btn');
  if (!btn) return;
  btn.disabled = disabled;
  if (disabled) {
    btn.textContent = 'Ending\u00A0Turn\u2026';
    btn.classList.add('is-ending');
  } else {
    btn.textContent = 'End Turn';
    btn.classList.remove('is-ending');
  }
}

/**
 * End the human player's turn.
 */
export function onEndTurn() {
  if (!G || G.dispatch) return;
  if (G.reward) return;  // must resolve reward (artifact draft) before ending turn
  if (isTurnLocked()) return;
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human') return;

  if (ch.moves > 0) {
    const msg = isDigEligible(G, ch)
      ? 'End turn here and dig for rewards?'
      : 'End turn with moves remaining?';
    openConfirmModal({ title: 'End Turn', message: msg })
      .then(confirmed => {
        if (confirmed) {
          setTurnLock(true);
          disableEndTurnBtn(true);
          finishTurn(G);
          refreshAll();
        }
      });
    return;
  }

  setTurnLock(true);
  disableEndTurnBtn(true);
  finishTurn(G);
  refreshAll();
}

/**
 * Execute one bot champion's decision (move, attack, or end).
 * Called by refreshAll via the clock scheduler when the active champion is a bot.
 */
export function runBot() {
  // Re-entry guard — another turn is already in flight
  if (isTurnLocked()) return;
  setTurnLock(true);

  const ch = currentChamp();
  if (ch) {
    const fac = FACTIONS[ch.faction];
    showBotIndicator(ch.name, fac?.color);
  }

  const decision = aiDecide(G);
  if (!decision || decision.action === 'end') {
    finishTurn(G);
    refreshAll();
    hideBotIndicator();
    // Lock cleared by refreshAll → beginTurn (or next champion)
    return;
  }

  if (
    decision.action === 'attackChampion' ||
    decision.action === 'attackMob'
  ) {
    const target = decision.target;
    const bothNonHuman =
      ch.controller !== 'human' &&
      (!target.controller || target.controller !== 'human');

    if (bothNonHuman) {
      resolveCombatSilently(G, ch, target);
      finishTurn(G);
      refreshAll();
      hideBotIndicator();
    } else {
      startCombat(ch, target);
      // hideBotIndicator is called in the combat flow's completion refresh
    }
    return;
  }

  if (decision.action === 'move') {
    const key = coordKey(decision.to);
    const range = movementRange(G, ch);
    const cost = range[key] ?? decision.cost ?? 1;
    moveChampion(G, ch, key, cost);
    refreshAll();
    getClock().setTimeout(() => {
      finishTurn(G);
      refreshAll();
      hideBotIndicator();
    }, 380, 'bot');
  }
}
