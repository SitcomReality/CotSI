import {
  sideOf,
  applyFinalBonuses,
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
} from '../../game/state/combat/index.js';

import {
  getCombatUI,
  getGameState,
  getRefreshAll,
  getToast,
} from './combatUiState.js';

import { renderCombat } from './combatRenderer.js';
import { openRewardModal } from './combatRewardUI.js';
import { closeCombat } from './combatLifecycle.js';
import {
  wait,
  shakeCard,
  flashCard,
  drainHp,
  floatText,
  getFxLayer,
  getCard,
} from './combatFx.js';

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
