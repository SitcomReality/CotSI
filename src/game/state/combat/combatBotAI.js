import { potencyWithPrimary, beats } from '../../rules/factionData.js';

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
 * Decide whether a combatant should flee after the current round.
 *
 * Returns true only after round 1 has completed and the entity is
 * non-human, alive, and continuing would be likely fatal.
 *
 * Mobs (no .controller) always flee after round 1 if they lost the round.
 *
 * @param {object} entity — The combatant entity (champion or mob)
 * @param {object} combat — The current combat state
 * @returns {boolean}
 */
export function shouldBotFlee(entity, combat) {
  if (!entity || !entity.alive) return false;
  if (combat.round <= 1) return false;

  // Humans decide on their own — never force-flee
  if (entity.controller === 'human') return false;

  const isChampion = !!entity.potencies;
  const { roundScores } = combat;
  const damageFromRound = Math.abs(roundScores.attacker - roundScores.defender);

  // Determine if this entity lost the most recent round
  const side = entity === combat.attacker ? 'attacker' : 'defender';
  const lost = side === 'attacker'
    ? roundScores.defender > roundScores.attacker
    : roundScores.attacker > roundScores.defender;

  if (!lost) return false;

  // Champions: flee if another round would be lethal
  if (isChampion) {
    return entity.hp <= damageFromRound;
  }

  // Mobs: always flee after round 1 if they lost
  return true;
}
