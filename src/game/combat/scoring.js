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

/** Score a single pair of picks (one from each combatant) */
export function scorePickPair(state, A, B, pickA, pickB){
  const potAraw = potencyWithPrimary(A);
  const potBraw = potencyWithPrimary(B);
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
  scoreA += A.tokens ? finalScoreBonus(state, A) : (state.weather.score[B.faction]||0);
  scoreB += B.tokens ? finalScoreBonus(state, B) : (state.weather.score[A.faction]||0);
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