import { potencyWithPrimary } from '../../rules/factionData.js';

/**
 * Record a pick for the given side in the current exchange.
 * Validates against getAvailablePicks(entity) and ensures no
 * repeated faction for that entity across exchanges.
 *
 * @param {object} combat — The combat state
 * @param {string} side — 'first' or 'second'
 * @param {number} factionIdx — The faction index to record
 * @returns {boolean} — true on success, false if the pick is invalid
 */
export function recordPick(combat, side, factionIdx) {
  const entity = combat[side];
  const available = getAvailablePicks(entity);

  // 1. Must be a valid available faction
  if (!available.includes(factionIdx)) return false;

  // 2. No repeated faction across exchanges — skipped for single-faction
  //    combatants (e.g. mobs, or a champion with one potency). With only one
  //    available faction they can't vary their pick, and the guard would make
  //    exchange 2 impossible: the pick is rejected, the exchange never scores,
  //    and interactive fights stall at pick2.
  if (available.length > 1) {
    for (const exchange of combat.exchanges) {
      if (exchange.picks[side] === factionIdx) return false;
    }
  }

  // 3. Determine current exchange index from phase
  const exchangeIdx = combat.phase === 'pick2' ? 1 : 0;
  const exchange = combat.exchanges[exchangeIdx];

  // 4. Side must not have already picked in this exchange
  if (exchange.picks[side] !== null) return false;

  // 5. Write the pick
  exchange.picks[side] = factionIdx;

  // 6. Advance awaitingSide to whoever picks next in this exchange
  //    (exchange 1: first → second; exchange 2: second → first). Once both
  //    picks are in, no one is awaiting — leave it null instead of leaving it
  //    on a side that already picked (the old flip-back state).
  if (bothPicksIn(combat)) {
    combat.awaitingSide = null;
  } else if (exchangeIdx === 0) {
    combat.awaitingSide = side === 'first' ? 'second' : 'first';
  } else {
    combat.awaitingSide = side === 'second' ? 'first' : 'second';
  }

  return true;
}

/**
 * Return true when both picks in the current exchange are non-null.
 *
 * @param {object} combat — The combat state
 * @returns {boolean}
 */
export function bothPicksIn(combat) {
  const exchangeIdx = combat.phase === 'pick2' ? 1 : 0;
  const exchange = combat.exchanges[exchangeIdx];
  return exchange.picks.first !== null && exchange.picks.second !== null;
}

/**
 * Transition through the combat phase sequence:
 *   pick1 → reveal1 → pick2 → reveal2 → roundEnd
 *
 * Sets awaitingSide per exchange order:
 *   - Exchange 1: awaitingSide starts as 'first' (both pick, then reveal)
 *   - Exchange 2: awaitingSide starts as 'second' (reversed order)
 *
 * Uses isPickingPhase guard: advance is a no-op for roundEnd.
 *
 * @param {object} combat — The combat state
 */
export function advancePhase(combat) {
  if (combat.phase === 'pick1') {
    combat.phase = 'reveal1';
    combat.awaitingSide = null;
  } else if (combat.phase === 'reveal1') {
    combat.phase = 'pick2';
    combat.awaitingSide = 'second';
  } else if (combat.phase === 'pick2') {
    combat.phase = 'reveal2';
    combat.awaitingSide = null;
  } else if (combat.phase === 'reveal2') {
    combat.phase = 'roundEnd';
    combat.awaitingSide = null;
  }
  // else: roundEnd — no-op
}

/**
 * Get available faction picks for an entity.
 * Returns faction indices where potency > 0.
 *
 * @param {object} entity — The entity (champion or mob)
 * @returns {number[]} Array of faction indices available to this entity
 */
export function getAvailablePicks(entity) {
  const pots = potencyWithPrimary(entity);
  return pots.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
}
