import { potencyWithPrimary, beats } from '../../rules/factionData.js';

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

  // 2. Entity must not have already picked this faction in any exchange
  //    (no repeated faction across exchanges)
  for (const exchange of combat.exchanges) {
    if (exchange.picks[side] === factionIdx) return false;
  }

  // 3. Determine current exchange index from phase
  const exchangeIdx = combat.phase === 'pick2' ? 1 : 0;
  const exchange = combat.exchanges[exchangeIdx];

  // 4. Side must not have already picked in this exchange
  if (exchange.picks[side] !== null) return false;

  // 5. Write the pick
  exchange.picks[side] = factionIdx;

  // 6. Switch awaitingSide to the other side (for the next pick call)
  //    Exchange 1: first → second
  //    Exchange 2: second → first
  if (exchangeIdx === 0) {
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
 * Blind pick AI for a bot combatant.
 *
 * Prefers the available faction that beats the opponent's most‑potent
 * revealed faction.  Tie‑breaks by own potency.
 *
 * **Never reads** the current exchange opponent pick — only considers
 * revealed (past exchange) opponent picks.
 *
 * @param {object} entity — The bot champion or mob entity
 * @param {number[]} revealedHistory — Opponent's revealed faction indices
 *                                     from previous exchanges
 * @param {number[]} available — Faction indices available for this entity
 * @returns {number} The chosen faction index
 */
export function botCombatPick(entity, revealedHistory, available) {
  const pots = potencyWithPrimary(entity);

  // Convert available indices to candidates with own potency
  const candidates = available.map(i => ({ idx: i, pot: pots[i] }));

  // No revealed intel — fall back to highest own potency
  if (!revealedHistory || revealedHistory.length === 0) {
    candidates.sort((a, b) => b.pot - a.pot);
    return candidates[0].idx;
  }

  // Score each candidate: how many revealed opponent picks does it beat?
  const scored = candidates.map(c => {
    let beatCount = 0;
    for (const op of revealedHistory) {
      if (beats(c.idx, op)) beatCount++;
    }
    return { ...c, beatCount };
  });

  // Prefer the candidate that beats the most opponent revealed picks;
  // tie‑break by own potency (highest first), then faction index for stability
  scored.sort((a, b) =>
    b.beatCount - a.beatCount ||
    b.pot - a.pot ||
    a.idx - b.idx
  );

  return scored[0].idx;
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
