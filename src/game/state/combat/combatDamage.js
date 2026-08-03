/**
 * combatDamage.js — Combat round damage resolution.
 *
 * Contains the damage application logic for a combat round:
 * comparing scores, applying HP loss, and checking for death.
 */
import { recordDeath } from '../deathTracker.js';
import { recordLedgerEntry } from '../dispatchLedger.js';
import { deriveOrder } from './combatState.js';

/**
 * Move a damaged combatant before the damager in global turn order.
 * Called when one champion takes damage from another in combat,
 * so the damaged champion acts earlier in future turns.
 */
export function moveDamagedBeforeDamager(state, damagedId, damagerId){
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
  combat.combatLog.push(
    dmg > 0
      ? `Round ${combat.round} damage: ${to === 'attacker' ? attacker.name : defender.name} takes ${dmg}`
      : `Round ${combat.round} damage: neither side takes damage`
  );
  if(attacker.hp <= 0) {
    attacker.alive = false;
    recordDeath(state, attacker, `fell in combat against ${defender.name}`);
  }
  if(defender.hp <= 0) {
    defender.alive = false;
    recordDeath(state, defender, `fell in combat against ${attacker.name}`);
  }
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
