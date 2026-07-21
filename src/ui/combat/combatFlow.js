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
  applyFinalBonuses,
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
  entityFor
} from '../../game/state/combat/index.js';

import {
  getCombatUI,
  getGameState,
  getRefreshAll,
  getToast
} from './combatUiState.js';

import { renderCombat } from './combatRenderer.js';
import { openRewardModal } from './combatRewardUI.js';
import { closeCombat } from './combatLifecycle.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import {
  wait,
  shakeCard,
  flashCard,
  drainHp,
  floatText,
  getFxLayer,
  getCard,
} from './combatFx.js';
import { animateReveal } from './combatReveal.js';

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
  startMeasure('combatFlow');

  while (getCombatUI()) {
    const combat = getCombatUI();

    // ---------- PICK PHASE ----------
    if (isPickingPhase(combat)) {
      const side = combat.awaitingSide;
      const entity = entityFor(combat, side);
      if (!entity) { endMeasure('combatFlow'); break; } // safety

      // Non-human (bot or mob - mobs have no controller)
      if (entity.controller !== 'human') {
        await wait(450);
        if (!getCombatUI()) { endMeasure('combatFlow'); return; } // cancelled (e.g. flee)

        const history = getOpponentRevealedHistory(combat, side);
        const available = getAvailablePicks(entity);
        const pick = botCombatPick(entity, history, available);
        if (pick == null) { endMeasure('combatFlow'); break; } // no valid pick (shouldn't happen)

        recordPick(combat, side, pick);
        if (bothPicksIn(combat)) {
          advancePhase(combat);
        }
        renderCombat();
        continue; // loop again - maybe second side is picking, or enter reveal
      }

      // Human - stop the loop; action bus will call runCombatFlow again
      endMeasure('combatFlow');
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
      if (!getCombatUI()) { endMeasure('combatFlow'); return; }

      advancePhase(combat);
      continue;
    }

    // ---------- ROUND END ----------
    if (combat.phase === 'roundEnd') {
      await handleRoundEnd();
      if (getCombatUI()) continue;
      endMeasure('combatFlow');
      return;
    }

    // Unknown phase - stop
    endMeasure('combatFlow');
    break;
  }

  endMeasure('combatFlow');
}

export async function handleRoundEnd() {
  const combat = getCombatUI();
  if (!combat || combat.phase !== 'roundEnd') return;

  const _G = getGameState();
  const { attacker, defender, roundScores } = combat;

  // Apply final bonuses (Crucible, weather, margin, Hollow)
  const { scoreA, scoreB } = applyFinalBonuses(
    _G, attacker, defender, roundScores.attacker, roundScores.defender
  );
  combat.roundScores.attacker = scoreA;
  combat.roundScores.defender = scoreB;

  const result = resolveRoundDamage(_G, combat);

  if (result.defenderDead) {
    const rewards = finalizeCombat(_G, attacker, defender, true);
    closeCombat();
    openRewardModal(attacker, {
      title: 'Victory!',
      type: 'spoils',
      body: `${attacker.name} has won the battle!`,
      rewards: [
        { icon: 'i-gold', label: `+${rewards.gold} gold` },
        { icon: 'i-relic', label: '+1 relic' },
      ],
    });
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return;
  }

  if (result.attackerDead) {
    closeCombat();
    const toast = getToast();
    if (toast) toast('You were defeated.', true);
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return;
  }

  // Trigger damage visual effects
  if (result.damage > 0) {
    const attSide = sideOf(combat, combat.attacker);
    const actualDamagedSide = result.to === 'attacker' ? attSide : (attSide === 'first' ? 'second' : 'first');

    const fxLayer = getFxLayer();
    const damagedCard = getCard(actualDamagedSide);

    // 1. Float damage text from the damaged card's HP bar
    if (fxLayer && damagedCard) {
      const hpBar = damagedCard.querySelector('.hpbar');
      if (hpBar) {
        floatText(fxLayer, hpBar, `-${result.damage}`, 'damage');
      }
    }

    // 2. Shake + flash the damaged card
    shakeCard(actualDamagedSide);
    flashCard(actualDamagedSide);

    // 3. Calculate new HP% and drain the bar
    const damagedEntity = result.to === 'attacker' ? combat.attacker : combat.defender;
    const newHpPct = Math.round((damagedEntity.hp / damagedEntity.maxHp) * 100);
    await drainHp(actualDamagedSide, newHpPct);

    // Render to sync DOM with new state
    renderCombat();
  }

  await wait(1200);
  if (!getCombatUI()) return;

  nextCombatRound(_G, combat); // re-derives first/second from updated G.globalOrder
  renderCombat();
}