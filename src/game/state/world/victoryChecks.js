/**
 * victoryChecks.js — Win-condition checks. Pure logic, only depends on champion data shape.
 */

export function checkVictory(state) {
  const living = state.champions.filter(c => c.alive);
  if (state.objectives.relicRace) {
    const w = living.find(c => c.relics >= state.objectives.relicTarget);
    if (w) {
      state.winnerId = w.id;
      state.victoryReason = `${w.name} gathered ${w.relics} relics.`;
      return true;
    }
  }
  if (state.objectives.lastStanding && living.length === 1) {
    state.winnerId = living[0].id;
    state.victoryReason = `${living[0].name} is the last champion standing.`;
    return true;
  }
  if (living.length === 0) {
    state.winnerId = 'none';
    state.victoryReason = 'The Interregnum consumes all.';
    return true;
  }
  return false;
}