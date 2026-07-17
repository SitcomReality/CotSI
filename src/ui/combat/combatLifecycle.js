import { createCombatState, getActiveCombatant, isPickingPhase, isRevealPhase, processReveal, advanceCombatPhase, resolveRoundDamage, nextCombatRound, finalizeCombat, applyFinalBonuses } from '../../game/combat/combat-index.js';
import { getCombatUI, setCombatUI, getGameState, getRefreshAll, getToast } from './combatStateManager.js';
import { renderCombat } from './combatRenderer.js';
import { makeBotPick } from './combatInteractions.js';
import { openRewardModal } from './combatRewardUI.js';
import { registerAction } from '../actionBus.js';

// ── Flee: close combat with no game-logic penalty ──
registerAction('fleeCombat', () => closeCombat());

/**
 * Central flow dispatcher: after any state mutation (pick, phase advance,
 * round transition), call this to drive the next step automatically.
 *
 * - picking + active is bot  ->  setTimeout(makeBotPick, 500)
 * - reveal                   ->  no-op (waits for human Commit)
 * - round_end                ->  handleRoundEnd()
 */
export function continueCombatFlow() {
  const _combatUI = getCombatUI();
  if (!_combatUI) return;

  if (_combatUI.phase === 'picking') {
    const active = getActiveCombatant(_combatUI);
    if (active && active.controller === 'bot') {
      setTimeout(() => makeBotPick(), 500);
    }
  } else if (_combatUI.phase === 'round_end') {
    handleRoundEnd();
  }
  // reveal phase: no automated action; waits for human Commit via processRevealPhase
}

export function startCombat(attacker, defender) {
  const ui = createCombatState(attacker, defender);
  setCombatUI(ui);
  openCombatModal();
}

export function openCombatModal() {
  document.getElementById('combatModal').style.display = 'flex';
  renderCombat();
  continueCombatFlow();
}

export function closeCombat() {
  document.getElementById('combatModal').style.display = 'none';
  setCombatUI(null);
}

export function processRevealPhase() {
  const _combatUI = getCombatUI();
  if (!_combatUI || !isRevealPhase(_combatUI)) return;
  const _G = getGameState();
  const reveal = processReveal(_G, _combatUI);
  if (reveal) {
    document.getElementById('csLeft').textContent = _combatUI.roundScores.attacker;
    document.getElementById('csRight').textContent = _combatUI.roundScores.defender;
    document.getElementById('combatLog').textContent = reveal.logA + '  vs  ' + reveal.logB;
    animateReveal(reveal);
  }
  setTimeout(() => {
    advanceCombatPhase(_combatUI);
    renderCombat();
    continueCombatFlow();
  }, 1200);
}

function animateReveal(reveal) {
  const leftSlots = document.querySelectorAll('#leftCombat .ctok');
  const rightSlots = document.querySelectorAll('#rightCombat .ctok');
  leftSlots.forEach((el) => {
    if (+el.dataset.f === reveal.pickA) el.style.transform = 'scale(1.15)';
  });
  rightSlots.forEach((el) => {
    if (+el.dataset.f === reveal.pickB) el.style.transform = 'scale(1.15)';
  });
  setTimeout(() => {
    leftSlots.forEach((el) => (el.style.transform = ''));
    rightSlots.forEach((el) => (el.style.transform = ''));
  }, 1000);
}

export function handleRoundEnd() {
  const _combatUI = getCombatUI();
  if (!_combatUI || _combatUI.phase !== 'round_end') return;

  const _G = getGameState();
  const { attacker, defender, roundScores } = _combatUI;
  const { scoreA, scoreB } = applyFinalBonuses(
    _G, attacker, defender, roundScores.attacker, roundScores.defender
  );
  _combatUI.roundScores.attacker = scoreA;
  _combatUI.roundScores.defender = scoreB;

  document.getElementById('csLeft').textContent = scoreA;
  document.getElementById('csRight').textContent = scoreB;

  const dmgResult = resolveRoundDamage(_G, _combatUI);
  document.getElementById('combatLog').textContent =
    `Round ${_combatUI.round} damage: ${
      dmgResult.to === 'attacker' ? attacker.name : defender.name
    } takes ${dmgResult.damage}`;

  if (dmgResult.defenderDead) {
    const rew = finalizeCombat(_G, attacker, defender, true);
    closeCombat();
    openRewardModal(attacker, {
      title: 'Victory!',
      body: `${attacker.name} has won the battle!`,
      rewards: [`+${rew.gold} gold`, '+1 relic']
    });
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return;
  }
  if (dmgResult.attackerDead) {
    closeCombat();
    const refresh = getRefreshAll();
    if (refresh) refresh();
    const toast = getToast();
    if (toast) toast('You were defeated.', true);
    return;
  }

  setTimeout(() => {
    nextCombatRound(_combatUI);
    renderCombat();
    continueCombatFlow();
  }, 1500);
}