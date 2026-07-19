/**
 * turnPipeline.js — Turn-advancement and bot decision execution.
 * Orchestrates game/state mutations with UI/render refreshes.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { finishTurn } from '../game/state/worldSimulation.js';
import { isDigEligible } from '../game/state/turnActions.js';
import { moveChampion, movementRange } from '../game/state/championMovement.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { startCombat } from '../ui/combat/combatModal.js';
import { toast } from '../ui/hud.js';
import { runBotTurn as aiDecide } from '../game/state/championAI.js';

/**
 * End the human player's turn.
 */
export function onEndTurn() {
  if (!G || G.dispatch) return;
  if (G.reward) return;  // must resolve reward (artifact draft) before ending turn
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human') return;

  if (ch.moves > 0) {
    if (
      !confirm(
        isDigEligible(G, ch)
          ? 'End turn here and dig for rewards?'
          : 'End turn with moves remaining?'
      )
    )
      return;
  }

  finishTurn(G);
  refreshAll();
}

/**
 * Execute one bot champion's decision (move, attack, or end).
 * Called by refreshAll via setTimeout when the active champion is a bot.
 */
export function runBot() {
  const decision = aiDecide(G);
  const ch = currentChamp();
  if (!decision || decision.action === 'end') {
    finishTurn(G);
    refreshAll();
    return;
  }

  if (
    decision.action === 'attackChampion' ||
    decision.action === 'attackMob'
  ) {
    startCombat(ch, decision.target);
    return;
  }

  if (decision.action === 'move') {
    const key = coordKey(decision.to);
    const range = movementRange(G, ch);
    const cost = range[key] ?? decision.cost ?? 1;
    moveChampion(G, ch, key, cost);
    refreshAll();
    setTimeout(() => {
      finishTurn(G);
      refreshAll();
    }, 380);
  }
}
