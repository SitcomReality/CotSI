import { coordKey, distance, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { findPath } from '../../engine/rules/pathfinding.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { movementRange } from './championMovement.js';
import { occupiedByChampion, occupiedByMob, getChampion } from './entityQueries.js';

export function botChooseTarget(state, champ){
  const searchRadius = champ.sight + champ.baseMove * 2 + 5;
  const searchKeys = hexesWithinRadius(searchRadius)
    .map(c => coordKey({ q: c.q + champ.pos.q, r: c.r + champ.pos.r }));

  const candidates=[];
  for(const key of searchKeys){
    const tile = state.tiles[key];
    if(!tile) continue;
    if(!(champ.explored||[]).includes(key)) continue;
    let score=0;
    if(tile.feature?.kind==='tree' && tile.feature.ripe!==false) score += (champ.hp < 60 ? 28 : 10);
    if(tile.feature?.kind==='knot' && !tile.feature.mined) score += 32;
    if(tile.feature?.kind==='base' && tile.feature.faction===champ.faction && champ.hp < 55) score += 24;
    const mob = state.mobs.find(m=> m.alive && coordKey(m.pos)===key);
    if(mob) score += 16;
    const trader = state.traders.find(t=> coordKey(t.pos)===key);
    if(trader) score += 10;
    // Exploration bonus: prefer unexplored tiles
    if (!(champ.explored || []).includes(key)) score += 5;
    if(score>0){
      const d = distance(champ.pos, tile);
      candidates.push({key, pos:{q:tile.q,r:tile.r}, score: score/(1+d*0.7)});
    }
  }
  candidates.sort((a,b)=> b.score-a.score);
  let target = candidates[0] || null;
  // Fallback: find closest unexplored hex to move toward
  if (!target) {
    let closestKey = null;
    let closestDist = Infinity;
    for (const key of searchKeys) {
      const tile = state.tiles[key];
      if (!tile || !TERRAIN[tile.terrain].passable) continue;
      if ((champ.explored || []).includes(key)) continue;
      const d = distance(champ.pos, tile);
      if (d < closestDist) {
        closestDist = d;
        closestKey = key;
      }
    }
    if (closestKey) {
      const tile = state.tiles[closestKey];
      target = { key: closestKey, pos: { q: tile.q, r: tile.r }, score: 1 };
    }
  }
  return target;
}

export function runBotTurn(state){
  const champ = getChampion(state, state.activeChampionId);
  if(!champ || !champ.alive || champ.controller!=='bot') return false;
  // adjacent attack?
  const adjEnemies = state.champions.filter(c=> c.alive && c.id!==champ.id && distance(c.pos, champ.pos)===1);
  if(adjEnemies.length && champ.hp>35 && state._rng()>0.55){
    return {action:'attackChampion', target: adjEnemies[0]};
  }
  const adjMobs = state.mobs.filter(m=> m.alive && distance(m.pos, champ.pos)===1);
  if(adjMobs.length && champ.hp>28 && state._rng()>0.4){
    return {action:'attackMob', target: adjMobs[0]};
  }
  const target = botChooseTarget(state, champ);
  if(!target) return {action:'end'};
  const path = findPath(champ.pos.q, champ.pos.r, target.pos.q, target.pos.r, champ.id,
    (key, isTarget) => {
      const tile = state.tiles[key];
      if (!tile || !TERRAIN[tile.terrain].passable) return false;
      const occ = occupiedByChampion(state, key);
      if (occ && occ.id !== champ.id && !isTarget) return false;
      if (occupiedByMob(state, key) && !isTarget) return false;
      return true;
    }
  );
  if(!path || !path.length) return {action:'end'};
  const steps = Math.min(champ.moves, path.length);
  const step = path[steps-1];
  return {action:'move', to: step, cost: steps, path: path.slice(0, steps)};
}
