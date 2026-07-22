/**
 * combatAutoResolve.js — Silent combat resolution for non-human encounters.
 *
 * Runs the full combat loop (picking, scoring, damage, reorder, loot) entirely
 * in game/state — no DOM, no modals, no animation. Used when neither participant
 * is a human player (bot-vs-bot, bot-vs-mob).
 *
 * Depends on combatState, combatPicks, combatScoring, and combatDamage.
 */

import { createCombatState } from './combatState.js';
import { botCombatPick } from './combatBotAI.js';
import { getAvailablePicks, recordPick, bothPicksIn, advancePhase } from './combatPicks.js';
import { processReveal, applyFinalBonuses } from './combatScoring.js';
import { resolveRoundDamage, nextCombatRound, finalizeCombat } from './combatDamage.js';

const MAX_ROUNDS = 50;

/**
 * Resolve a combat between two non-human entities instantly, with no UI.
 *
 * @param {object} state    — Live game state (G)
 * @param {object} attacker — The entity that initiated combat
 * @param {object} defender — The entity being attacked
 * @returns {{ winner: object|null, loser: object|null, rounds: number }}
 */
export function resolveCombatSilently(state, attacker, defender) {
  const combat = createCombatState(state, attacker, defender);
  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    rounds++;

    // ── Exchange 1: first picks, then second (simultaneous reveal) ──
    combat.phase = 'pick1';
    combat.awaitingSide = 'first';
    pickForSide(combat, 'first');
    pickForSide(combat, 'second');
    advancePhase(combat); // → reveal1
    processReveal(state, combat);
    advancePhase(combat); // → pick2

    // ── Exchange 2: second picks, then first (reverse order) ──
    combat.awaitingSide = 'second';
    pickForSide(combat, 'second');
    combat.awaitingSide = 'first';
    pickForSide(combat, 'first');
    advancePhase(combat); // → reveal2
    processReveal(state, combat);
    advancePhase(combat); // → roundEnd

    // ── Round end: apply bonuses, damage, check for death ──
    const { scoreA, scoreB } = applyFinalBonuses(
      state, combat.attacker, combat.defender,
      combat.roundScores.attacker, combat.roundScores.defender
    );
    combat.roundScores.attacker = scoreA;
    combat.roundScores.defender = scoreB;

    const result = resolveRoundDamage(state, combat);
    if (result.defenderDead || result.attackerDead) {
      const attackerWon = result.defenderDead;
      const winner = attackerWon ? combat.attacker : combat.defender;
      const loser = attackerWon ? combat.defender : combat.attacker;
      finalizeCombat(state, winner, loser, attackerWon);
      return { winner, loser, rounds };
    }

    // ── Next round ──
    nextCombatRound(state, combat);
  }

  // Safety cap: 50 rounds with no death — treat as draw (both survive)
  return { winner: null, loser: null, rounds };
}

/**
 * Have a bot entity make a pick for the given side in the current exchange.
 */
function pickForSide(combat, side) {
  const entity = combat[side];
  const available = getAvailablePicks(entity);

  // Build the opponent's revealed history from previous exchanges
  const exchangeIdx = combat.phase === 'pick2' ? 1 : 0;
  const opponentSide = side === 'first' ? 'second' : 'first';
  const revealedHistory = [];
  for (let i = 0; i < exchangeIdx; i++) {
    const prev = combat.exchanges[i];
    if (prev.picks[opponentSide] !== null) {
      revealedHistory.push(prev.picks[opponentSide]);
    }
  }

  const pick = botCombatPick(entity, revealedHistory, available);
  if (pick !== undefined && pick !== null) {
    recordPick(combat, side, pick);
  }
}
