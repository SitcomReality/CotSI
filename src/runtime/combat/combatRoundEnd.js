import {
  sideOf,
  applyFinalBonuses,
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
} from '../../game/state/combat/index.js';

import { G } from '../../game/state/liveGame.js';
import { getCombatUI, wait } from './combatState.js';
import { refreshAll } from '../refreshAll.js';
import { toast } from '../../ui/hud.js';
import { renderCombat } from './combatRender.js';
import { openRewardModal } from '../../ui/combat/combatRewardUI.js';
import { closeCombat } from './combatLifecycle.js';
import { resolveDungeonBattleWin } from '../../game/state/features/dungeonSystem.js';
import { dailyActionPoints } from '../../game/state/movement/championMovement.js';
import {
  shakeCard,
  flashCard,
  drainHp,
  floatText,
  getFxLayer,
  getCard,
} from '../../ui/combat/combatFx.js';
import { ROUND_END_HOLD_MS } from '../../params/ui/combatUiParams.js';

export async function handleRoundEnd() {
  const combat = getCombatUI();
  if (!combat || combat.phase !== 'roundEnd') return;

  const { attacker, defender, roundScores } = combat;

  // Apply final bonuses (Crucible, weather, margin, Hollow)
  const { scoreA, scoreB } = applyFinalBonuses(
    G, attacker, defender, roundScores.attacker, roundScores.defender
  );
  combat.roundScores.attacker = scoreA;
  combat.roundScores.defender = scoreB;

  const result = resolveRoundDamage(G, combat);

  if (result.defenderDead) {
    const rewards = finalizeCombat(G, attacker, defender, true);
    // Dungeon battle won: advance the run (day 1/2) or complete it (day 3).
    // A completed run keeps the champion's turn alive for a full move turn.
    let completion = null;
    if (defender.dungeonBattle) {
      completion = resolveDungeonBattleWin(G, attacker);
      if (completion.completed) {
        // Full turn after the conquest: restore the day's AP and clear the
        // combat flag so movement and night-digging work as usual.
        attacker.actionPoints = dailyActionPoints(G, attacker);
        attacker.lastActionCombat = false;
        combat.suppressEndTurn = true;
      }
    }
    closeCombat();
    openRewardModal(attacker, {
      title: completion?.completed ? 'Dungeon Conquered!' : 'Victory!',
      type: 'spoils',
      body: completion?.completed
        ? `${attacker.name} has won the battle and claimed the dungeon's hoard!`
        : `${attacker.name} has won the battle!`,
      rewards: [
        { icon: 'i-gold', label: `+${rewards.gold} gold` },
        { icon: 'i-relic', label: '+1 relic' },
        ...(completion?.completed
          ? [
              { icon: 'i-relic', label: `+${completion.rewards.relic} relic` },
              { icon: 'd-knot', label: `+${completion.rewards.knots} God's Knots` },
            ]
          : []),
      ],
    });
    refreshAll();
    return;
  }

  if (result.attackerDead) {
    closeCombat();
    toast('You were defeated.', true);
    refreshAll();
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
    renderCombat(combat);
  }

  await wait(ROUND_END_HOLD_MS);
  if (!getCombatUI()) return;

  nextCombatRound(G, combat); // re-derives first/second from updated G.globalOrder
  renderCombat(combat);
}
