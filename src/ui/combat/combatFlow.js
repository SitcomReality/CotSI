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
  entityFor,
  shouldBotFlee,
  fleeFromCombat
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
import { BOT_PICK_DELAY_MS, ROUND_END_HOLD_MS } from '../../params/ui/combatUiParams.js';

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
  const setContext = measure ? measure.setContext : () => {};
  const clearContext = measure ? measure.clearContext : () => {};
  measureStart('combatFlow');

  // Set profiler context: combat active
  const combat = getCombatUI();
  if (combat) {
    setContext({ phase: 'combat', detail: 'active' });
  }

  while (getCombatUI()) {
    const combat = getCombatUI();

    // ---------- PICK PHASE ----------
    if (isPickingPhase(combat)) {
      const side = combat.awaitingSide;
      const entity = entityFor(combat, side);
      if (!entity) { clearContext(); measureEnd('combatFlow'); break; } // safety

      // Non-human (bot or mob - mobs have no controller)
      if (entity.controller !== 'human') {
        await wait(BOT_PICK_DELAY_MS);
        if (!getCombatUI()) { clearContext(); measureEnd('combatFlow'); return; } // cancelled (e.g. flee)

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
      await wait(ROUND_END_HOLD_MS); // extra hold for the eye to register
      if (!getCombatUI()) { clearContext(); measureEnd('combatFlow'); return; }

      advancePhase(combat);
      continue;
    }

    // ---------- ROUND END ----------
    if (combat.phase === 'roundEnd') {
      // Bots decide to flee BEFORE the round's damage is applied — the flee path
      // applies the round's damage itself (capped at 1 HP) and ends combat.
      // Checking after handleRoundEnd was broken: it zeroes roundScores and bumps
      // the round, so shouldBotFlee always saw a clean slate and bots never fled.
      const _G = getGameState();
      if (_G) {
        if (shouldBotFlee(combat.defender, combat)) {
          fleeFromCombat(_G, combat, 'defender');
          closeCombat();
          clearContext();
          measureEnd('combatFlow');
          return;
        }
        if (shouldBotFlee(combat.attacker, combat)) {
          fleeFromCombat(_G, combat, 'attacker');
          closeCombat();
          clearContext();
          measureEnd('combatFlow');
          return;
        }
      }

      await handleRoundEnd();
      if (!getCombatUI()) { clearContext(); measureEnd('combatFlow'); return; } // combat ended (death)

      continue;
    }

    // Unknown phase - stop
    clearContext();
    measureEnd('combatFlow');
    break;
  }

  clearContext();
  measureEnd('combatFlow');
}

