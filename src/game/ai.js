import { coordKey, parseKey, neighbors, distance, TERRAIN } from '../world/map.js';
import { movementRange } from './movement.js';
import { occupiedByChampion, occupiedByMob, getChampion } from './entityQueries.js';

function findPath(state, sx, sy, tx, ty, champId){
  const start = `${sx},${sy}`, target=`${tx},${ty}`;
  const came = new Map([[start,null]]);
  const q=[start];
  while(q.length){
    const cur=q.shift();
    if(cur===target) break;
    const {q:x,r:y} = parseKey(cur);
    for(const n of neighbors({q:x,r:y})){
      const key=coordKey(n);
      const tile = state.tiles[key];
      if(!tile || !TERRAIN[tile.terrain].passable) continue;
      if(came.has(key)) continue;
      const occ = occupiedByChampion(state,key);
      if(occ && occ.id!==champId && key!==target) continue;
      if(occupiedByMob(state,key) && key!==target) continue;
      came.set(key,cur); q.push(key);
    }
  }
  if(!came.has(target)) return null;
  const path=[]; let cur=target;
  while(cur && cur!==start){ path.unshift(parseKey(cur)); cur=came.get(cur); }
  return path;
}

export function botChooseTarget(state, champ){
  const candidates=[];
  for(const [key,tile] of Object.entries(state.tiles)){
    if(!(champ.explored||[]).includes(key)) continue;
    let score=0;
    if(tile.feature?.kind==='tree' && tile.feature.ripe!==false) score += (champ.hp < 60 ? 28 : 10);
    if(tile.feature?.kind==='knot' && !tile.feature.mined) score += 32;
    if(tile.feature?.kind==='base' && tile.feature.faction===champ.faction && champ.hp < 55) score += 24;
    const mob = state.mobs.find(m=> m.alive && coordKey(m.pos)===key);
    if(mob) score += 16;
    const trader = state.traders.find(t=> coordKey(t.pos)===key);
    if(trader) score += 10;
    if(score>0){
      const d = distance(champ.pos, tile);
      candidates.push({key, pos:{q:tile.q,r:tile.r}, score: score/(1+d*0.7)});
    }
  }
  candidates.sort((a,b)=> b.score-a.score);
  return candidates[0] || null;
}

export function runBotTurn(state){
  const champ = getChampion(state, state.activeChampionId);
  if(!champ || !champ.alive || champ.controller!=='bot') return false;
  // adjacent attack?
  const adjEnemies = state.champions.filter(c=> c.alive && c.id!==champ.id && distance(c.pos, champ.pos)===1);
  if(adjEnemies.length && champ.hp>35 && Math.random()>0.55){
    return {action:'attackChampion', target: adjEnemies[0]};
  }
  const adjMobs = state.mobs.filter(m=> m.alive && distance(m.pos, champ.pos)===1);
  if(adjMobs.length && champ.hp>28 && Math.random()>0.4){
    return {action:'attackMob', target: adjMobs[0]};
  }
  const target = botChooseTarget(state, champ);
  if(!target) return {action:'end'};
  const path = findPath(state, champ.pos.q, champ.pos.r, target.pos.q, target.pos.r, champ.id);
  if(!path || !path.length) return {action:'end'};
  const steps = Math.min(champ.moves, path.length);
  const step = path[steps-1];
  return {action:'move', to: step, cost: steps};
}
