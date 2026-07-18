import {
  createCombatState,
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
} from '../../game/combat/combat-index.js';

import {
  getCombatUI,
  setCombatUI,
  getGameState,
  getRefreshAll,
  getToast
} from './combatStateManager.js';

import { renderCombat } from './combatRenderer.js';
import { openRewardModal } from './combatRewardUI.js';
import { showModal, hideModal } from '../modal.js';
import {
  wait,
  revealSlot,
  clashPulse,
  countUp,
  floatText,
  shakeCard,
  flashCard,
  drainHp,
  getSlot,
  getFxLayer,
  getCard,
} from './combatFx.js';

import { FACTIONS } from '../../core/factions.js';

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
  while (getCombatUI()) {
    const combat = getCombatUI();

    // ---------- PICK PHASE ----------
    if (isPickingPhase(combat)) {
      const side = combat.awaitingSide;
      const entity = entityFor(combat, side);
      if (!entity) break; // safety

      // Non‑human (bot or mob – mobs have no controller)
      if (entity.controller !== 'human') {
        await wait(450);
        if (!getCombatUI()) return; // cancelled (e.g. flee)

        const history = getOpponentRevealedHistory(combat, side);
        const available = getAvailablePicks(entity);
        const pick = botCombatPick(entity, history, available);
        if (pick == null) break; // no valid pick (shouldn't happen)

        recordPick(combat, side, pick);
        if (bothPicksIn(combat)) {
          advancePhase(combat);
        }
        renderCombat();
        continue; // loop again – maybe second side is picking, or enter reveal
      }

      // Human – stop the loop; action bus will call runCombatFlow again
      break;
    }

    // ---------- REVEAL PHASE ----------
    if (isRevealPhase(combat)) {
      const _G = getGameState();
      const reveal = processReveal(_G, combat); // writes combat.lastReveal
      if (reveal) {
        await animateReveal(reveal); // Phase 4 placeholder — await for FX completion
      }
      renderCombat();
      await wait(1200); // extra hold for the eye to register
      if (!getCombatUI()) return;

      advancePhase(combat);
      continue;
    }

    // ---------- ROUND END ----------
    if (combat.phase === 'roundEnd') {
      await handleRoundEnd();
      // if handleRoundEnd returned normally, continue
      if (getCombatUI()) continue;
      return;
    }

    // Unknown phase – stop
    break;
  }
}

async function handleRoundEnd() {
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
      body: `${attacker.name} has won the battle!`,
      rewards: [`+${rewards.gold} gold`, '+1 relic']
    });
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return; // sequencer stops (combat UI cleared)
  }

  if (result.attackerDead) {
    closeCombat();
    const toast = getToast();
    if (toast) toast('You were defeated.', true);
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return;
  }

  // Trigger damage visual effects (using result from first resolveRoundDamage call)
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

  nextCombatRound(_G, combat); // re‑derives first/second from updated G.globalOrder
  renderCombat();
  // control returns to runCombatFlow loop
}

// ---- combat lifecycle functions ----

export function startCombat(attacker, defender) {
  if (getCombatUI()) return; // re‑entry guard

  const _G = getGameState();
  const combat = createCombatState(_G, attacker, defender); // from Phase 1
  setCombatUI(combat);
  openCombatModal();
}

export function openCombatModal() {
  showModal('combatModal');
  renderCombat();
  runCombatFlow(); // start the sequence
}

export function closeCombat() {
  hideModal('combatModal');
  setCombatUI(null);
}

async function animateReveal(reveal) {
  const combat = getCombatUI();
  if (!combat || !reveal) return;

  const modalEl = document.getElementById('combatModal');
  const fxLayer = getFxLayer();

  // Determine which slots we're flipping (exchange 0 or 1)
  const exchangeIdx = combat.phase === 'reveal1' ? 0 : 1;

  // Get the picks for this exchange
  const exchange = combat.exchanges[exchangeIdx];
  const pickFirst = exchange.picks.first;
  const pickSecond = exchange.picks.second;

  // --- Slot A (first's slot) ---
  const slotAId = exchangeIdx === 0 ? 'sA1' : 'sA2';
  const slotA = getSlot(slotAId);
  if (slotA && pickFirst != null) {
    // Update slot content to show the revealed faction
    const fac = FACTIONS[reveal.first.factionIdx];
    slotA.textContent = fac.glyph + ' ' + fac.name;
    slotA.style.setProperty('--slot-color', fac.color);
    slotA.classList.add('face-down'); // start face-down
  }

  // --- Slot B (second's slot) ---
  const slotBId = exchangeIdx === 0 ? 'sB1' : 'sB2';
  const slotB = getSlot(slotBId);
  if (slotB && pickSecond != null) {
    const fac = FACTIONS[reveal.second.factionIdx];
    slotB.textContent = fac.glyph + ' ' + fac.name;
    slotB.style.setProperty('--slot-color', fac.color);
    slotB.classList.add('face-down');
  }

  // --- Flip both slots ---
  if (slotA) revealSlot(slotA, reveal.first.factionIdx);
  if (slotB) revealSlot(slotB, reveal.second.factionIdx);

  await wait(420); // let flips finish (--dur-slow)

  // --- Clash pulse: highlight winning/losing faction tokens ---
  clashPulse(reveal, modalEl);

  await wait(150);

  // --- Count-up the running totals ---
  const leftEl = document.getElementById('csLeft');
  const rightEl = document.getElementById('csRight');

  // Determine which total maps to which side
  // runningTotals.attacker sums the attacker's cumulative round score
  // left = first, right = second. Need to map attackerSide to left/right.
  const attackerSide = reveal.first.factionIdx === pickFirst
    ? 'first'
    : (reveal.first.factionIdx === pickSecond ? 'second' : null);
  // Better approach: read current displayed values and animate to new totals
  const curLeft = parseInt(leftEl?.textContent, 10) || 0;
  const curRight = parseInt(rightEl?.textContent, 10) || 0;
  const targetAttacker = reveal.runningTotals.attacker;
  const targetDefender = reveal.runningTotals.defender;

  const attSide = sideOf(combat, combat.attacker);

  if (attSide === 'first') {
    // attacker = left, defender = right
    await Promise.all([
      countUp(leftEl, curLeft, targetAttacker, 500),
      countUp(rightEl, curRight, targetDefender, 500),
    ]);
    // Float score deltas
    const deltaAtt = targetAttacker - curLeft;
    const deltaDef = targetDefender - curRight;
    if (deltaAtt > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaAtt}`, 'score');
    }
    if (deltaDef > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaDef}`, 'score');
    }
  } else {
    // attacker = right, defender = left
    await Promise.all([
      countUp(leftEl, curLeft, targetDefender, 500),
      countUp(rightEl, curRight, targetAttacker, 500),
    ]);
    const deltaDef = targetDefender - curLeft;
    const deltaAtt = targetAttacker - curRight;
    if (deltaDef > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaDef}`, 'score');
    }
    if (deltaAtt > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaAtt}`, 'score');
    }
  }
}