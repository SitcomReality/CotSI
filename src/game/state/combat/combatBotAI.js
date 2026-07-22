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
