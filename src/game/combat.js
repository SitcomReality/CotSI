import { FACTIONS, potencyWithPrimary } from '../core/factions.js';
import { scorePower } from '../core/paley.js';
import { coordKey, parseKey } from '../world/map.js';
import { addLog } from './log.js';
import { getChampion } from './entityQueries.js';
import { refreshVision } from './vision.js';
import { checkVictory } from './victory.js';

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
function scorePickPair(state, A, B, pickA, pickB){
  const potAraw = A.tokens ? potencyWithPrimary(A) : A.potencies;
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
  scoreA += A.tokens ? finalScoreBonus(state, A) : (state.weather.score[B.faction]||0);
  scoreB += B.tokens ? finalScoreBonus(state, B) : (state.weather.score[A.faction]||0);
  return { scoreA, scoreB };
}

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
    // Update awaitingPick for next pick phase
    if(combat.phase === 'pick2_defender') combat.awaitingPick = 'defender';
    else if(combat.phase === 'pick2_attacker') combat.awaitingPick = 'attacker';
    else if(combat.phase === 'pick1_attacker') combat.awaitingPick = 'attacker'; // next round
  } else {
    combat.phase = 'round_end';
  }
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

/** Apply damage from round scores and check for deaths */
export function resolveRoundDamage(state, combat){
  const { attacker, defender, roundScores } = combat;
  let dmg = 0, to = 'none';
  if(roundScores.attacker > roundScores.defender){
    dmg = roundScores.attacker - roundScores.defender;
    defender.hp -= dmg;
    to = 'defender';
    if(defender.tokens) moveDamagedBeforeDamager(state, defender.id, attacker.id);
  } else if(roundScores.defender > roundScores.attacker){
    dmg = roundScores.defender - roundScores.attacker;
    attacker.hp -= dmg;
    to = 'attacker';
    if(attacker.tokens && defender.tokens) moveDamagedBeforeDamager(state, attacker.id, defender.id);
  }
  combat.combatLog.push(`Round ${combat.round} damage: ${to === 'attacker' ? attacker.name : defender.name} takes ${dmg}`);
  if(attacker.hp <= 0) attacker.alive = false;
  if(defender.hp <= 0) defender.alive = false;
  return { damage: dmg, to, attackerDead: !attacker.alive, defenderDead: !defender.alive };
}

/** Prepare for next round (reset round-specific state) */
export function nextCombatRound(combat){
  combat.round++;
  combat.roundPicks = { attacker: [], defender: [] };
  combat.roundScores = { attacker: 0, defender: 0 };
  combat.phase = 'pick1_attacker';
  combat.awaitingPick = 'attacker';
  combat.lastReveal = null;
}

/** Bot picks a card (simple AI: highest potency that counters opponent if possible) */
export function botCombatPick(entity, opponentPicks, availablePicks){
  const pots = entity.tokens ? potencyWithPrimary(entity) : entity.potencies;
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

/** Get available picks (indices with potency > 0) */
export function getAvailablePicks(entity){
  const pots = entity.tokens ? potencyWithPrimary(entity) : entity.potencies;
  return pots.map((v,i)=> v > 0 ? i : -1).filter(i=> i>=0);
}

function moveDamagedBeforeDamager(state, damagedId, damagerId){
  const di = state.globalOrder.indexOf(damagedId);
  const ai = state.globalOrder.indexOf(damagerId);
  if(di===-1||ai===-1||di < ai) return;
  state.globalOrder.splice(di,1);
  const newAi = state.globalOrder.indexOf(damagerId);
  state.globalOrder.splice(newAi, 0, damagedId);
}

export function finalizeCombat(state, attacker, defender, attackerWon){
  attacker.lastActionCombat = true;
  attacker.moves = 0;
  if(attackerWon && attacker.alive && !defender.alive){
    attacker.pos = {...defender.pos};
    const gold = defender.lootGold || (12 + Math.floor(Math.random()*14));
    attacker.gold += gold;
    attacker.relics += 1;
    if(attacker.faction===3){
      const rf = Math.floor(Math.random()*7); attacker.tokens[rf] += 1;
    }
    addLog(state, `${attacker.name} defeats ${defender.name} and claims a relic (+${gold}g).`);
    return { gold, relic:1 };
  }
  if(!attacker.alive){
    addLog(state, `${attacker.name} falls in combat against ${defender.name}.`);
  }
  refreshVision(state);
  checkVictory(state);
  return null;
}