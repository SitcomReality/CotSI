import { addLogEntry } from '../gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { refreshVision } from '../fogOfWar.js';
import { checkVictory } from '../victoryChecks.js';
import { recordDeath } from '../deathTracker.js';
import { recordLedgerEntry } from '../dispatchLedger.js';
import { FACTIONS } from '../../rules/factionData.js';
import { deriveOrder } from './combatState.js';
import { applyFinalBonuses } from './combatScoring.js';

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

/**
 * Resolve combat via flee — apply the current round's damage (with final bonuses)
 * but prevent death: the fleeing entity survives at 1 HP minimum.
 *
 * Handles turn-order reorder, ledger entries, log, and attacker's
 * `lastActionCombat` / `moves` zeroing. Does NOT grant loot or move positions.
 *
 * @param {object} state       — Live game state (G)
 * @param {object} combat      — Current combat state
 * @param {'attacker'|'defender'} fleeingSide — Who is fleeing
 * @returns {{ fled: string, damage: number }}
 */
export function fleeFromCombat(state, combat, fleeingSide) {
  const { attacker, defender } = combat;

  // Apply final bonuses to get the true round scores
  const { scoreA, scoreB } = applyFinalBonuses(
    state, attacker, defender,
    combat.roundScores.attacker, combat.roundScores.defender
  );
  combat.roundScores.attacker = scoreA;
  combat.roundScores.defender = scoreB;

  const fleeingEntity = fleeingSide === 'attacker' ? attacker : defender;
  const otherEntity = fleeingSide === 'attacker' ? defender : attacker;
  const fleeingWon =
    fleeingSide === 'attacker'
      ? scoreA > scoreB
      : scoreB > scoreA;

  let dmg = 0;
  if (fleeingWon) {
    // Fleeing side won the round — other side takes damage, but no flee benefit
    dmg = fleeingSide === 'attacker' ? scoreA - scoreB : scoreB - scoreA;
    otherEntity.hp -= dmg;
    if (otherEntity.potencies && fleeingEntity.potencies) {
      moveDamagedBeforeDamager(state, otherEntity.id, fleeingEntity.id);
    }
    recordLedgerEntry(otherEntity, `-${dmg} HP — duel vs ${fleeingEntity.name}`, 'loss', 'hp');
  } else {
    // Fleeing side lost — take damage, but cap at 1 HP
    dmg = fleeingSide === 'attacker' ? scoreB - scoreA : scoreA - scoreB;
    const newHp = fleeingEntity.hp - dmg;
    if (newHp <= 0) {
      dmg = fleeingEntity.hp - 1; // cap damage to survive at 1 HP
    }
    fleeingEntity.hp -= dmg;
    if (fleeingEntity.potencies && otherEntity.potencies) {
      moveDamagedBeforeDamager(state, fleeingEntity.id, otherEntity.id);
    }
    recordLedgerEntry(fleeingEntity, `-${dmg} HP — duel vs ${otherEntity.name}`, 'loss', 'hp');
  }

  combat.combatLog.push(`Round ${combat.round}: ${fleeingEntity.name} flees (${dmg} damage)`);

  // Attacker always ends their turn after combat
  attacker.lastActionCombat = true;
  attacker.moves = 0;

  const factionMap = buildChampionFactionMap(state.champions);
  addLogEntry(state, {
    category: LOG_CATEGORY.COMBAT,
    subject: championSegment(fleeingEntity.name, factionMap),
    verb: 'fled from combat with',
    object: championSegment(otherEntity.name, factionMap),
    detail: { text: `-${dmg} HP`, color: 'var(--text-muted)' },
  });

  refreshVision(state);
  checkVictory(state);
  return { fled: fleeingSide, damage: dmg };
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
  const factionMap = buildChampionFactionMap(state.champions);
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
    addLogEntry(state, {
      category: LOG_CATEGORY.COMBAT,
      subject: championSegment(attacker.name, factionMap),
      verb: 'defeated',
      object: championSegment(defender.name, factionMap),
      detail: { text: `+${gold}g, +1 relic`, color: 'var(--gold)' },
    });
    return { gold, relic:1 };
  }
  if(!attacker.alive){
    addLogEntry(state, {
      category: LOG_CATEGORY.DEATH,
      subject: championSegment(attacker.name, factionMap),
      verb: 'fell in combat against',
      object: championSegment(defender.name, factionMap),
      detail: null,
    });
  }
  refreshVision(state);
  checkVictory(state);
  return null;
}