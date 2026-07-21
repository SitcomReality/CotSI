import { FACTIONS, potencyWithPrimary, beats } from '../../rules/factionData.js';
import { scorePower } from '../../rules/paleyScoring.js';
import { sideOf } from './combatState.js';

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

  let logA = `${FACTIONS[pickA].textGlyph} ${potA[pickA]}→${sA}`;
  let logB = `${FACTIONS[pickB].textGlyph} ${potB[pickB]}→${sB}`;

  // Crucible Scarshield applies to final score only, not per-pair
  return { scoreA: sA, scoreB: sB, logA, logB, potA: potA[pickA], potB: potB[pickB] };
}

/** Apply final score bonuses (Crucible, weather, artifacts, Hollow) */
export function applyFinalBonuses(state, A, B, scoreA, scoreB){
  // Crucible Scarshield
  const week = Math.floor((state.day-1)/7)+1;
  if(A.faction===0){ scoreB = Math.max(0, scoreB - week); }
  if(B.faction===0){ scoreA = Math.max(0, scoreA - week); }
  // Final bonuses — champions get the full finalScoreBonus; mobs get their own faction's weather score
  scoreA += ('controller' in A) ? finalScoreBonus(state, A) : (state.weather.score[A.faction]||0);
  scoreB += ('controller' in B) ? finalScoreBonus(state, B) : (state.weather.score[B.faction]||0);
  return { scoreA, scoreB };
}

/** Process a reveal phase — score the current exchange and build the rich lastReveal payload. */
export function processReveal(state, combat){
  // Determine which exchange we're revealing (first or second)
  const exchangeIdx = combat.phase === 'reveal1' ? 0 : 1;
  const exchange = combat.exchanges[exchangeIdx];
  const pickFirst = exchange.picks.first;
  const pickSecond = exchange.picks.second;

  if (pickFirst === null || pickSecond === null) return null;

  const firstEntity = combat.first;
  const secondEntity = combat.second;

  // Score this pair using the stateless engine
  const result = scorePickPair(state, firstEntity, secondEntity, pickFirst, pickSecond);

  // Accumulate round scores — map by pick order (first/second) to combat role (attacker/defender)
  const attackerSide = sideOf(combat, combat.attacker);
  if (attackerSide === 'first') {
    combat.roundScores.attacker += result.scoreA;
    combat.roundScores.defender += result.scoreB;
  } else {
    combat.roundScores.attacker += result.scoreB;
    combat.roundScores.defender += result.scoreA;
  }

  // Compute weather modifications (same weather value used for both sides for consistency)
  const weatherModFirst = state.weather.potency[pickFirst] || 0;
  const weatherModSecond = state.weather.potency[pickSecond] || 0;

  // Build the rich lastReveal payload
  combat.lastReveal = {
    first: {
      factionIdx: pickFirst,
      basePotency: result.potA,
      weatherMod: weatherModFirst,
      multiplier: 1,                   // no per-pick multiplier in current rules
      beats: beats(pickFirst, pickSecond),
      score: result.scoreA
    },
    second: {
      factionIdx: pickSecond,
      basePotency: result.potB,
      weatherMod: weatherModSecond,
      multiplier: 1,
      beats: beats(pickSecond, pickFirst),
      score: result.scoreB
    },
    runningTotals: {
      attacker: combat.roundScores.attacker,
      defender: combat.roundScores.defender
    }
  };

  combat.combatLog.push(
    `Reveal ${exchangeIdx + 1}: ${result.logA}  vs  ${result.logB}`
  );

  return combat.lastReveal;
}