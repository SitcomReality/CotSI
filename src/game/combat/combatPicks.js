import { FACTIONS, potencyWithPrimary } from '../../core/factions.js';
import { scorePower } from '../../core/scorePowerPaleyMath.js';

function finalScoreBonus(state, champ){
  let bonus = state.weather.score[champ.faction] || 0;
  if(champ.artifact==='margin') bonus += 2;
  if(champ.faction===6){
    const missing = champ.maxHp - champ.hp;
    const week = Math.floor((state.day-1)/7)+1;
    bonus += Math.ceil(missing/10) * Math.ceil(week/3);
  }
  return bonus;
}

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

/** Score a single pair of picks (one from each combatant) */
export function scorePickPair(state, A, B, pickA, pickB){
  const potAraw = A.tokens ? potencyWithPrimary(A) : A.potencies; // need to remove vestigial reference to tokens. only potencies now.
  const potBraw = B.tokens ? potencyWithPrimary(B) : B.potencies;
  const potA = potAraw.map((v,i)=> Math.max(0, v + (state.weather.potency[i]||0)));
  const potB = potBraw.map((v,i)=> Math.max(0, v + (state.weather.potency[i]||0)));

  const sA = scorePower(pickA, potA[pickA]||0, [pickB]);
  const sB = scorePower(pickB, potB[pickB]||0, [pickA]);

  let logA = `${FACTIONS[pickA].glyph} ${potA[pickA]}→${sA}`;
  let logB = `${FACTIONS[pickB].glyph} ${potB[pickB]}→${sB}`;

  // Crucible Scarshield applies to final score only, not per-pair
  return { scoreA: sA, scoreB: sB, logA, logB, potA: potA[pickA], potB: potB[pickB] };
}
/** Apply final score bonuses (Crucible, weather, artifacts, Hollow) */
export function applyFinalBonuses(state, A, B, scoreA, scoreB){
  // Crucible Scarshield
  const week = Math.floor((state.day-1)/7)+1;
  if(A.faction===0){ scoreB = Math.max(0, scoreB - week); }
  if(B.faction===0){ scoreA = Math.max(0, scoreA - week); }
  // Final bonuses


  scoreA += A.faction===0 ? finalScoreBonus(state, A) : (state.weather.score[B.faction]||0);
  scoreB += B.faction===0 ? finalScoreBonus(state, B) : (state.weather.score[A.faction]||0);
  return { scoreA, scoreB };
}

/** Process a reveal phase - score the current pair of picks */
export function processReveal(state, combat){
  const { attacker, defender, roundPicks } = combat;
  const pickIdx = combat.phase === 'reveal1' ? 0 : 1;
  const pickA = roundPicks.attacker[pickIdx];
  const pickB = roundPicks.defender[pickIdx];

  if(pickA === undefined || pickB === undefined) return null;

  const res = scorePickPair(state, attacker, defender, pickA, pickB);
  combat.roundScores.attacker += res.scoreA;
  combat.roundScores.defender += res.scoreB;
  combat.lastReveal = {
    pickA, pickB,
    scoreA: res.scoreA, scoreB: res.scoreB,
    logA: res.logA, logB: res.logB,
    potA: res.potA, potB: res.potB
  };
  combat.combatLog.push(`Reveal ${combat.phase === 'reveal1' ? 1 : 2}: ${res.logA}  vs  ${res.logB}`);
  return combat.lastReveal;
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
   return pots.map((v,i)=> v > 0 ? i : -1).filter(i=> i>=0);
 }