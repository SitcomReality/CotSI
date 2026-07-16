/**
 * turnController — Turn-advancement and bot decision execution.
 * Lives in the `game/` domain. References `G` via live binding from
 * gameOrchestrator (circular import, used at runtime only).
 */
import { G, currentChamp, refreshAll } from './gameOrchestrator.js';
import { finishTurn } from './worldTurn.js';
import { isDigEligible } from './turnLogic.js';
import { moveChampion, movementRange } from './movement.js';
import { coordKey } from '../world/map.js';
import { startCombat } from '../ui/combat/combatui-index.js';
import { toast } from '../ui/hud.js';
import { runBotTurn as aiDecide } from './ai.js';

/**
 * End the human player's turn.
 */
export function onEndTurn() {
  if (!G) return;
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