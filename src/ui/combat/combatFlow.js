import {
  sideOf,
  isPickingPhase,
  isRevealPhase,
  recordPick,
  advancePhase,
  bothPicksIn,
  getAvailablePicks,
  botCombatPick,
  processReveal,
  entityFor
} from '../../game/state/combat/index.js';

import {
  getCombatUI,
  getGameState,
  getMeasure
} from './combatUiState.js';

import { renderCombat } from './combatRenderer.js';
import { closeCombat } from './combatLifecycle.js';
import { wait } from './combatFx.js';
import { animateReveal } from './combatReveal.js';
import { handleRoundEnd } from './combatRoundEnd.js';

// ---- helpers ----

function getOpponentRevealedHistory(combat, awaitingSide) {
  // Returns pick indices from previous exchanges that belong to the opponent
  const exchangeIdx = combat.phase === 'pick1' ? 0 : 1;
  if (exchangeIdx === 0) return [];
  const previous = combat.exchanges[0];
  const opponentSide = awaitingSide === 'first' ? 'second' : 'first';
  const pick = previous.picks[opponentSide];
  return pick !== null ? [pick] : [];
}

// ---- async sequencer ----

export async function runCombatFlow() {
  const measure = getMeasure();
  const measureStart = measure ? measure.start : () => {};
  const measureEnd = measure ? measure.end : () => {};
  measureStart('combatFlow');

  while (getCombatUI()) {
    const combat = getCombatUI();

    // ---------- PICK PHASE ----------
    if (isPickingPhase(combat)) {
      const side = combat.awaitingSide;
      const entity = entityFor(combat, side);
      if (!entity) { measureEnd('combatFlow'); break; } // safety

      // Non-human (bot or mob - mobs have no controller)
      if (entity.controller !== 'human') {
        await wait(450);
        if (!getCombatUI()) { measureEnd('combatFlow'); return; } // cancelled (e.g. flee)

        const history = getOpponentRevealedHistory(combat, side);
        const available = getAvailablePicks(entity);
        const pick = botCombatPick(entity, history, available);
        if (pick == null) { measureEnd('combatFlow'); closeCombat(); break; } // no valid pick — abort combat

        recordPick(combat, side, pick);
        if (bothPicksIn(combat)) {
          advancePhase(combat);
        }
        renderCombat();
        continue; // loop again - maybe second side is picking, or enter reveal
      }

      // Human - stop the loop; action bus will call runCombatFlow again
      measureEnd('combatFlow');
      break;
    }

    // ---------- REVEAL PHASE ----------
    if (isRevealPhase(combat)) {
      const _G = getGameState();
      const reveal = processReveal(_G, combat); // writes combat.lastReveal
      if (reveal) {
        await animateReveal(reveal);
      }
      renderCombat();
      await wait(1200); // extra hold for the eye to register
      if (!getCombatUI()) { measureEnd('combatFlow'); return; }

      advancePhase(combat);
      continue;
    }

    // ---------- ROUND END ----------
    if (combat.phase === 'roundEnd') {
      await handleRoundEnd();
      if (getCombatUI()) continue;
      measureEnd('combatFlow');
      return;
    }

    // Unknown phase - stop
    measureEnd('combatFlow');
    break;
  }

  measureEnd('combatFlow');
}

