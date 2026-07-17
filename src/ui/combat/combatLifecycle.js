import { createCombatState, getActiveCombatant, isPickingPhase, isRevealPhase, processReveal, advanceCombatPhase, resolveRoundDamage, nextCombatRound, finalizeCombat, applyFinalBonuses } from '../../game/combat/combat-index.js';
import { getCombatUI, setCombatUI, getGameState, getRefreshAll, getToast } from './combatStateManager.js';
import { renderCombat } from './combatRenderer.js';
import { makeBotPick } from './combatInteractions.js';
import { openRewardModal } from './combatRewardUI.js';
import { registerAction } from '../actionBus.js';
import { showModal, hideModal } from '../modal.js';

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
  showModal('combatModal');
  renderCombat();
  continueCombatFlow();
}

export function closeCombat() {
  hideModal('combatModal');
  setCombatUI(null);
}

export function processRevealPhase() {
  const _combatUI = getCombatUI();
  if (!_combatUI || !isRevealPhase(_combatUI)) return;
  const _G = getGameState();
  const reveal = processReveal(_G, _combatUI);
  if (reveal) {
    animateReveal(reveal);
    // Scores and log are updated via the combatUI object;
    // renderCombat() will pick them up after phase advance.
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
    if (+el.dataset.f === reveal.pickA) el.classList.add('reveal-pulse');
  });
  rightSlots.forEach((el) => {
    if (+el.dataset.f === reveal.pickB) el.classList.add('reveal-pulse');
  });
  setTimeout(() => {
    document.querySelectorAll('.ctok.reveal-pulse').forEach((el) => {
      el.classList.remove('reveal-pulse');
    });
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

  const dmgResult = resolveRoundDamage(_G, _combatUI);
  // Combat log is updated by resolveRoundDamage; renderCombat will show it.

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