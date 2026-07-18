/**
 * combatState.js — Combat state factory and initiative derivation.
 *
 * Creates a stateless combat object with the new first/second architecture:
 *   - `first` / `second` are entity references derived from G.globalOrder
 *   - `attacker` / `defender` are kept for reward eligibility only
 *   - `exchanges` is an array of hidden pick slots (two per round)
 *   - `awaitingSide` uses 'first' | 'second' instead of attacker/defender
 *
 * Mobs are not in globalOrder. Champion always takes first vs mob.
 * Mob vs mob → deterministic attacker-first fallback.
 */

/**
 * Determine `first` and `second` from G.globalOrder.
 *
 * @param {object} state — The live game state (G), must have `globalOrder` array of champion IDs.
 * @param {object} attacker — The entity that initiated combat.
 * @param {object} defender — The entity that was attacked.
 * @returns {{ first: object, second: object }}
 */
export function deriveOrder(state, attacker, defender) {
  const attackerIdx = state.globalOrder.indexOf(attacker.id);
  const defenderIdx = state.globalOrder.indexOf(defender.id);

  // Both are champions in globalOrder → earlier index is first
  if (attackerIdx !== -1 && defenderIdx !== -1) {
    if (attackerIdx < defenderIdx) {
      return { first: attacker, second: defender };
    } else {
      return { first: defender, second: attacker };
    }
  }

  // Only attacker is in globalOrder → attacker is first
  if (attackerIdx !== -1 && defenderIdx === -1) {
    return { first: attacker, second: defender };
  }

  // Only defender is in globalOrder → defender is first
  if (attackerIdx === -1 && defenderIdx !== -1) {
    return { first: defender, second: attacker };
  }

  // Neither is in globalOrder (mob vs mob) → deterministic attacker-first fallback
  return { first: attacker, second: defender };
}

/**
 * Create a new combat state object.
 *
 * @param {object} state — The live game state (G), used to derive initiative order.
 * @param {object} attacker — The entity that initiated combat.
 * @param {object} defender — The entity that was attacked.
 * @returns {object} combat — The new combat state.
 */
export function createCombatState(state, attacker, defender) {
  const { first, second } = deriveOrder(state, attacker, defender);

  return {
    attacker,
    defender,
    first,
    second,
    round: 1,
    phase: 'pick1',                 // pick1 → reveal1 → pick2 → reveal2 → roundEnd
    exchanges: [
      { picks: { first: null, second: null } },
      { picks: { first: null, second: null } },
    ],
    roundScores: { attacker: 0, defender: 0 },
    lastReveal: null,               // per-exchange breakdown payload for FX
    combatLog: [],
    awaitingSide: 'first',          // 'first' | 'second' | null
  };
}

/**
 * Map an entity to its side ('first' | 'second') in the combat.
 * Compares by object identity first, then by id.
 *
 * @param {object} combat — The combat state.
 * @param {object} entity — The entity to look up.
 * @returns {string|null} 'first', 'second', or null if not found.
 */
export function sideOf(combat, entity) {
  if (entity === combat.first) return 'first';
  if (entity === combat.second) return 'second';
  if (entity.id && entity.id === combat.first?.id) return 'first';
  if (entity.id && entity.id === combat.second?.id) return 'second';
  return null;
}

/**
 * Map a side ('first' | 'second') to the corresponding entity.
 *
 * @param {object} combat — The combat state.
 * @param {string} side — 'first' or 'second'.
 * @returns {object|null} The entity, or null if the side is invalid.
 */
export function entityFor(combat, side) {
  if (side === 'first') return combat.first;
  if (side === 'second') return combat.second;
  return null;
}

/**
 * Get the combatant whose turn it is to pick.
 * Maps awaitingSide ('first' | 'second') to the entity via entityFor().
 *
 * @param {object} combat — The combat state.
 * @returns {object|null} The entity whose turn it is, or null.
 */
export function getActiveCombatant(combat) {
  return entityFor(combat, combat.awaitingSide);
}

/**
 * Check if combat is in a picking phase.
 * A phase starting with 'pick' means we're waiting for a pick.
 *
 * @param {object} combat — The combat state.
 * @returns {boolean}
 */
export function isPickingPhase(combat) {
  return combat.phase.startsWith('pick');
}

/**
 * Check if combat is in a reveal phase.
 * A phase starting with 'reveal' means we're showing picks.
 *
 * @param {object} combat — The combat state.
 * @returns {boolean}
 */
export function isRevealPhase(combat) {
  return combat.phase.startsWith('reveal');
}