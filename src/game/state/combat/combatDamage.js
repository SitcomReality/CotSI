import { addLog } from '../gameLog.js';
import { refreshVision } from '../fogOfWar.js';
import { checkVictory } from '../victoryChecks.js';
import { recordLedgerEntry } from '../dispatchLedger.js';
import { FACTIONS } from '../../rules/factionData.js';
import { deriveOrder } from './combatState.js';

function moveDamagedBeforeDamager(state, damagedId, damagerId){
  const di = state.globalOrder.indexOf(damagedId);
  const ai = state.globalOrder.indexOf(damagerId);
  if(di===-1||ai===-1||di < ai) return;
  state.globalOrder.splice(di,1);
  const newAi = state.globalOrder.indexOf(damagerId);
  state.globalOrder.splice(newAi, 0, damagedId);
}

/** Apply damage from round scores and check for deaths */
export function resolveRoundDamage(state, combat){
  const { attacker, defender, roundScores } = combat;
  let dmg = 0, to = 'none';
  if(roundScores.attacker > roundScores.defender){
    dmg = roundScores.attacker - roundScores.defender;
    defender.hp -= dmg;
    to = 'defender';
    recordLedgerEntry(defender, `-${dmg} HP — duel vs ${attacker.name}`, 'loss');
    if(defender.potencies) moveDamagedBeforeDamager(state, defender.id, attacker.id);
  } else if(roundScores.defender > roundScores.attacker){
    dmg = roundScores.defender - roundScores.attacker;
    attacker.hp -= dmg;
    to = 'attacker';
    recordLedgerEntry(attacker, `-${dmg} HP — duel vs ${defender.name}`, 'loss', 'hp');
    if(attacker.potencies && defender.potencies) moveDamagedBeforeDamager(state, attacker.id, defender.id);
  }
  combat.combatLog.push(`Round ${combat.round} damage: ${to === 'attacker' ? attacker.name : defender.name} takes ${dmg}`);
  if(attacker.hp <= 0) attacker.alive = false;
  if(defender.hp <= 0) defender.alive = false;
  return { damage: dmg, to, attackerDead: !attacker.alive, defenderDead: !defender.alive };
}

/** Prepare for next round (reset round-specific state).
 *  Accepts `state` to re-derive first/second from G.globalOrder
 *  (after round-end reorder by moveDamagedBeforeDamager).
 */
export function nextCombatRound(state, combat){
  combat.round++;
  // Re-derive first/second from current globalOrder
  const { first, second } = deriveOrder(state, combat.attacker, combat.defender);
  combat.first = first;
  combat.second = second;
  // Reset round-specific state
  combat.exchanges = [
    { picks: { first: null, second: null } },
    { picks: { first: null, second: null } },
  ];
  combat.roundScores = { attacker: 0, defender: 0 };
  combat.phase = 'pick1';
  combat.awaitingSide = 'first';
  combat.lastReveal = null;
}

export function finalizeCombat(state, attacker, defender, attackerWon){
  attacker.lastActionCombat = true;
  attacker.moves = 0;
  if(attackerWon && attacker.alive && !defender.alive){
    attacker.pos = {...defender.pos};
    refreshVision(state);
    const gold = defender.lootGold || (12 + Math.floor(state._rng()*14));
    attacker.gold += gold;
    attacker.relics += 1;
    recordLedgerEntry(attacker, `+${gold} gold, +1 relic — spoils of ${defender.name}`, 'gain', 'relic');
    if(attacker.faction===3){
      const rf = Math.floor(state._rng()*7); attacker.potencies[rf] += 1;
      recordLedgerEntry(attacker, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain', 'potency');
    }
    addLog(state, `${attacker.name} defeats ${defender.name} and claims a relic (+${gold}g).`);
    return { gold, relic:1 };
  }
  if(!attacker.alive){
    addLog(state, `${attacker.name} falls in combat against ${defender.name}.`);
  }
  refreshVision(state);
  checkVictory(state);
  return null;
}