import { FACTIONS, potencyWithPrimary } from '../core/factions.js';
import { scorePower } from '../core/paley.js';
import { coordKey, parseKey } from '../world/map.js';
import { addLog, getChampion, refreshVision, checkVictory } from './state.js';

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

export function resolveCombatRound(state, A, B, picksA, picksB){
  const potAraw = A.tokens ? potencyWithPrimary(A) : A.potencies;
  const potBraw = B.tokens ? potencyWithPrimary(B) : B.potencies;
  const potA = potAraw.map((v,i)=> Math.max(0, v + (state.weather.potency[i]||0)));
  const potB = potBraw.map((v,i)=> Math.max(0, v + (state.weather.potency[i]||0)));
  let scoreA=0, scoreB=0;
  let logA=[], logB=[];
  picksA.forEach(p=>{
    const s = scorePower(p, potA[p]||0, picksB);
    scoreA += s; logA.push(`${FACTIONS[p].glyph} ${potA[p]}→${s}`);
  });
  picksB.forEach(p=>{
    const s = scorePower(p, potB[p]||0, picksA);
    scoreB += s; logB.push(`${FACTIONS[p].glyph} ${potB[p]}→${s}`);
  });
  // Crucible Scarshield
  if(A.faction===0){ scoreB = Math.max(0, scoreB - (Math.floor((state.day-1)/7)+1)); }
  if(B.faction===0){ scoreA = Math.max(0, scoreA - (Math.floor((state.day-1)/7)+1)); }
  scoreA += A.tokens ? finalScoreBonus(state, A) : (state.weather.score[B.faction]||0);
  scoreB += B.tokens ? finalScoreBonus(state, B) : (state.weather.score[A.faction]||0);
  return {scoreA, scoreB, log:`${logA.join(' + ')}  vs  ${logB.join(' + ')}`};
}

export function botCombatPicks(entity, opponentPicks){
  const pots = entity.tokens ? potencyWithPrimary(entity) : entity.potencies;
  const idxs = [...pots.keys()].sort((a,b)=> pots[b]-pots[a]);
  // try counter
  const { beats } = require ? {beats:()=>false} : {beats:()=>false};
  // we avoid require, inline beats check
  const beatsCheck = (a,b)=> [1,2,4].includes((b-a+7)%7);
  let picks=[];
  for(const i of idxs){
    if(opponentPicks.some(op=> beatsCheck(i,op))){ picks.push(i); break; }
  }
  for(const i of idxs){ if(!picks.includes(i)) picks.push(i); if(picks.length>=2) break; }
  return picks.slice(0,2);
}

export function runCombatResolution(state, attacker, defender, picksA, picksB, combatMeta){
  const res = resolveCombatRound(state, attacker, defender, picksA, picksB);
  combatMeta.lastScoreA = res.scoreA;
  combatMeta.lastScoreB = res.scoreB;
  combatMeta.lastLog = res.log;
  if(res.scoreA > res.scoreB){
    const dmg = res.scoreA - res.scoreB;
    defender.hp -= dmg;
    combatMeta.lastDamage = { to:'defender', amount:dmg };
    if(defender.tokens) moveDamagedBeforeDamager(state, defender.id, attacker.id);
  } else if(res.scoreB > res.scoreA){
    const dmg = res.scoreB - res.scoreA;
    attacker.hp -= dmg;
    combatMeta.lastDamage = { to:'attacker', amount:dmg };
    if(attacker.tokens && defender.tokens) moveDamagedBeforeDamager(state, attacker.id, defender.id);
  } else {
    combatMeta.lastDamage = { to:'none', amount:0 };
  }
  if(attacker.hp <= 0) attacker.alive = false;
  if(defender.hp <= 0) defender.alive = false;
  return res;
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
    // move attacker onto defender tile
    attacker.pos = {...defender.pos};
    const gold = defender.lootGold || (12 + Math.floor(Math.random()*14));
    attacker.gold += gold;
    attacker.relics += 1;
    if(attacker.faction===3){ // Archive
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
