/** Create initial combat state for a new duel */
export function createCombatState(attacker, defender){
  return {
    attacker, defender,
    round: 1,
    phase: 'pick1_attacker', // pick1_attacker, pick1_defender, reveal1, pick2_defender, pick2_attacker, reveal2, round_end
    roundPicks: { attacker: [], defender: [] }, // picks made this round (max 2 each)
    roundScores: { attacker: 0, defender: 0 },
    allPicks: { attacker: [], defender: [] }, // all picks across rounds
    lastReveal: null, // { pickA, pickB, scoreA, scoreB, logA, logB }
    combatLog: [],
    awaitingPick: 'attacker', // whose turn to pick
    revealQueue: [], // queue of reveals to process
  };
}

/** Get the combatant whose turn it is to pick */
export function getActiveCombatant(combat){
  return combat.awaitingPick === 'attacker' ? combat.attacker : combat.defender;
}

/** Check if combat is in a picking phase */
export function isPickingPhase(combat){
  return combat.phase.startsWith('pick');
}

/** Check if combat is in a reveal phase */
export function isRevealPhase(combat){
  return combat.phase.startsWith('reveal');
}