import { coordKey, distance, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { findPath } from '../../engine/rules/pathfinding.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { movementRange } from './championMovement.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader, getChampion } from './entityQueries.js';
import { BOT_SEARCH_MOVE_MULTIPLIER, BOT_SEARCH_PADDING, BOT_TREE_HP_THRESHOLD, BOT_TREE_SCORE_INJURED, BOT_TREE_SCORE_HEALTHY, BOT_KNOT_SCORE, BOT_EXPLORE_BONUS, BOT_DISTANCE_DECAY, BOT_ATTACK_CHAMPION_HP_THRESHOLD, BOT_ATTACK_CHAMPION_CHANCE, BOT_ATTACK_MOB_HP_THRESHOLD, BOT_ATTACK_MOB_CHANCE } from '../../params/game/aiParams.js';

export function botChooseTarget(state, champ){
  const searchRadius = champ.sight + champ.baseMove * BOT_SEARCH_MOVE_MULTIPLIER + BOT_SEARCH_PADDING;
  const searchKeys = hexesWithinRadius(searchRadius)
    .map(c => coordKey({ q: c.q + champ.pos.q, r: c.r + champ.pos.r }));

  const candidates=[];
  for(const key of searchKeys){
    const tile = state.tiles[key];
    if(!tile) continue;
    if(!(champ.explored||[]).includes(key)) continue;
    let score=0;
    if(tile.feature?.kind==='tree' && tile.feature.ripe!==false) score += (champ.hp < BOT_TREE_HP_THRESHOLD ? BOT_TREE_SCORE_INJURED : BOT_TREE_SCORE_HEALTHY);
    if(tile.feature?.kind==='knot' && !tile.feature.mined) score += BOT_KNOT_SCORE;
    // Note: mob/trader hexes are not scorable — champions cannot pathfind
    // onto them. The bot attacks adjacent mobs directly (see runBotTurn).
    // Base-hex scoring is also removed: champions cannot occupy base hexes;
    // they heal by interacting from an adjacent hex at distance 1.
    // Exploration bonus: prefer unexplored tiles
    if (!(champ.explored || []).includes(key)) score += BOT_EXPLORE_BONUS;
    if(score>0){
      const d = distance(champ.pos, tile);
      candidates.push({key, pos:{q:tile.q,r:tile.r}, score: score/(1+d*BOT_DISTANCE_DECAY)});
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
  if(adjEnemies.length && champ.hp>BOT_ATTACK_CHAMPION_HP_THRESHOLD && state._rng()>BOT_ATTACK_CHAMPION_CHANCE){
    return {action:'attackChampion', target: adjEnemies[0]};
  }
  const adjMobs = state.mobs.filter(m=> m.alive && distance(m.pos, champ.pos)===1);
  if(adjMobs.length && champ.hp>BOT_ATTACK_MOB_HP_THRESHOLD && state._rng()>BOT_ATTACK_MOB_CHANCE){
    return {action:'attackMob', target: adjMobs[0]};
  }
  const target = botChooseTarget(state, champ);
  if(!target) return {action:'end'};
  const path = findPath(champ.pos.q, champ.pos.r, target.pos.q, target.pos.r, champ.id,
    (key, _isTarget) => {
      const tile = state.tiles[key];
      if (!tile || !TERRAIN[tile.terrain].passable) return false;
      // Champions can never occupy a hex with a base, mob, trader,
      // or another champion — even as the path target.
      if (tile.feature?.kind === 'base') return false;
      const occ = occupiedByChampion(state, key);
      if (occ && occ.id !== champ.id) return false;
      if (occupiedByMob(state, key)) return false;
      if (occupiedByTrader(state, key)) return false;
      return true;
    }
  );
  if(!path || !path.length) return {action:'end'};
  const steps = Math.min(champ.moves, path.length);
  const step = path[steps-1];
  return {action:'move', to: step, cost: steps, path: path.slice(0, steps)};
}
