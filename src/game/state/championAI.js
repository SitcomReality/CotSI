import { coordKey, distance, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { weightedFindPath } from '../../engine/rules/pathfinding.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { terrainCost, isTerrainBlocked } from '../rules/movementCosts.js';
import { canChampionEnter, getChampion } from './entityQueries.js';
import { featureValueForBot } from './featureRewards.js';
import { BOT_SEARCH_MOVE_MULTIPLIER, BOT_SEARCH_PADDING, BOT_FONT_HP_THRESHOLD, BOT_FONT_SCORE_INJURED, BOT_FONT_SCORE_HEALTHY, BOT_KNOT_SCORE, BOT_EXPLORE_BONUS, BOT_DISTANCE_DECAY, BOT_ATTACK_CHAMPION_HP_THRESHOLD, BOT_ATTACK_CHAMPION_CHANCE, BOT_ATTACK_MOB_HP_THRESHOLD, BOT_ATTACK_MOB_CHANCE } from '../../params/game/aiParams.js';

export function botChooseTarget(state, champ){
  // Search radius in hexes: sight + the champion's daily reach on open ground
  // (AP pool ÷ typical terrain cost) scaled by the search multiplier.
  const searchRadius = champ.sight + (champ.baseActionPoints / TERRAIN.plains.movementCost) * BOT_SEARCH_MOVE_MULTIPLIER + BOT_SEARCH_PADDING;
  const searchKeys = hexesWithinRadius(searchRadius)
    .map(c => coordKey({ q: c.q + champ.pos.q, r: c.r + champ.pos.r }));

  const candidates=[];
  for(const key of searchKeys){
    const tile = state.tiles[key];
    if(!tile) continue;
    if(!(champ.explored||[]).includes(key)) continue;
    let score=0;
    if(tile.feature?.kind==='blessedFont' && tile.feature.ripe!==false) score += (champ.hp < BOT_FONT_HP_THRESHOLD ? BOT_FONT_SCORE_INJURED : BOT_FONT_SCORE_HEALTHY);
    if(tile.feature?.kind==='knot' && !tile.feature.mined) score += BOT_KNOT_SCORE;
    // Reward-bearing features (featureRewards.js kinds); 0 for scenery or spent.
    score += featureValueForBot(state, champ, tile);
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
      if (!tile || isTerrainBlocked(champ, tile.terrain)) continue;
      // Dungeons are champion-only (humans) — bots never path onto them.
      if (tile.feature?.kind === 'dungeon') continue;
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
  // adjacent attack? (champions inside dungeons are hidden and cannot be attacked)
  const adjEnemies = state.champions.filter(c=> c.alive && !c.dungeon && c.id!==champ.id && distance(c.pos, champ.pos)===1);
  if(adjEnemies.length && champ.hp>BOT_ATTACK_CHAMPION_HP_THRESHOLD && state._rng()>BOT_ATTACK_CHAMPION_CHANCE){
    return {action:'attackChampion', target: adjEnemies[0]};
  }
  const adjMobs = state.mobs.filter(m=> m.alive && distance(m.pos, champ.pos)===1);
  if(adjMobs.length && champ.hp>BOT_ATTACK_MOB_HP_THRESHOLD && state._rng()>BOT_ATTACK_MOB_CHANCE){
    return {action:'attackMob', target: adjMobs[0]};
  }
  const target = botChooseTarget(state, champ);
  if(!target) return {action:'end'};
  const path = weightedFindPath(champ.pos.q, champ.pos.r, target.pos.q, target.pos.r,
    (key) => {
      const tile = state.tiles[key];
      if (!tile) return Infinity;
      // Champions can never occupy a hex with a base, mob, trader,
      // or another champion — even as the path target. Feature hexes are
      // destination-only (never routed through), matching movementRange.
      if (key !== coordKey(target.pos) && tile.feature) return Infinity;
      return canChampionEnter(state, key, champ) ? terrainCost(champ, tile.terrain, tile.biomeId) : Infinity;
    }
  );
  if(!path || !path.length) return {action:'end'};
  // Walk the longest prefix the AP pool can afford (terrain costs vary).
  const steps = [];
  let budget = champ.actionPoints;
  for (const hex of path) {
    const cost = terrainCost(champ, state.tiles[coordKey(hex)].terrain, state.tiles[coordKey(hex)].biomeId);
    // cost <= 0 would walk without spending AP — disallowed by the ladder
    // (every cost ≥ 1); guard so the re-decide loop can never spin forever.
    if (cost <= 0 || cost > budget) break;
    budget -= cost;
    steps.push(hex);
  }
  if(!steps.length) return {action:'end'};
  return {action:'move', to: steps[steps.length-1], path: steps};
}
