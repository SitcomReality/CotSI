/**
 * combatFlee.js — Flee-from-combat resolution.
 *
 * When a champion flees, the current round's damage is applied
 * (with final bonuses) but death is prevented: the fleeing entity
 * survives at 1 HP minimum.
 */
import { applyFinalBonuses } from './combatScoring.js';
import { moveDamagedBeforeDamager } from './combatDamage.js';
import { recordLedgerEntry } from '../dispatchLedger.js';
import { addLogEntry } from '../gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { refreshVision } from '../fogOfWar.js';
import { checkVictory } from '../victoryChecks.js';

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
