/** Record a pick for the active combatant */
export function recordCombatPick(combat, pick){
  const active = combat.awaitingPick;
  combat.roundPicks[active].push(pick);
  combat.allPicks[active].push(pick);
}

/** Advance combat to next phase */
export function advanceCombatPhase(combat){
  const phaseOrder = [
    'pick1_attacker', 'pick1_defender', 'reveal1',
    'pick2_defender', 'pick2_attacker', 'reveal2',
    'round_end'
  ];
  const idx = phaseOrder.indexOf(combat.phase);
  if(idx >= 0 && idx + 1 < phaseOrder.length){
    combat.phase = phaseOrder[idx + 1];
    if(combat.phase === 'pick2_defender') combat.awaitingPick = 'defender';
    else if(combat.phase === 'pick2_attacker') combat.awaitingPick = 'attacker';
    else if(combat.phase === 'pick1_attacker') combat.awaitingPick = 'attacker';
  } else {
    combat.phase = 'round_end';
  }
}

export function botCombatPick(entity, opponentPicks, availablePicks){
   const pots = potencyWithPrimary(entity);
   const idxs = [...pots.keys()].sort((a,b)=> pots[b]-pots[a]);
   const beatsCheck = (a,b)=> [1,2,4].includes((b-a+7)%7);
   // Try to counter opponent's known picks
   for(const i of idxs){
     if(opponentPicks.some(op=> beatsCheck(i,op)) && availablePicks.includes(i)){
       return i;
     }
   }
   // Otherwise highest available
   for(const i of idxs){
     if(availablePicks.includes(i)) return i;
   }
   return idxs[0];
}

 export function getAvailablePicks(entity){
   const pots = potencyWithPrimary(entity);
   return pots.map((v,i)=> v > 0 ? -1 : i).filter(i=> i>=0);
 }