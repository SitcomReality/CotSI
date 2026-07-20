/**
 * terrainGeneration.js — Seeded terrain generation and terrain type rules.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 */
import { seededNoise, stringSeed } from '../../engine/rules/seededRng.js';
import { coordKey, parseKey, distance, neighbors, hexesWithinRadius } from '../../engine/rules/hexGrid.js';

export const TERRAIN = {
  plains:  { fill:'#74ad5d', ink:'#c8e0b8', label:'Plains', passable:true, mark:'' },
  forest:  { fill:'#4b8e41', ink:'#a0d090', label:'Forest', passable:true, mark:'∷' },
  desert:  { fill:'#d6b15b', ink:'#f0d890', label:'Desert', passable:true, mark:'·' },
  marsh:   { fill:'#819967', ink:'#b8cfa0', label:'Marsh', passable:true, mark:'≈' },
  mountain:{ fill:'#877c6a', ink:'#c0b8a8', label:'Impassable peaks', passable:false, mark:'∧' },
  water:   { fill:'#5f9ac1', ink:'#a0d0e8', label:'Broken water', passable:false, mark:'~' },
};

export function generateTiles(seedText, radius){
  const seed = stringSeed(seedText);
  const tiles={};
  for(const c of hexesWithinRadius(radius)){
    const elevation = seededNoise(seed, c.q, c.r, 1);
    const moisture = seededNoise(seed, c.q, c.r, 2);
    let terrain='plains';
    if(elevation>0.905) terrain='mountain';
    else if(elevation<0.07 && moisture>0.5) terrain='water';
    else if(moisture>0.72) terrain='forest';
    else if(moisture<0.20) terrain='desert';
    else if(moisture>0.58 && elevation<0.35) terrain='marsh';
    const key = coordKey(c);
    tiles[key] = {...c, terrain, feature:null };
  }
  // ensure contiguous passable land
  const passableKeys = Object.keys(tiles).filter(k=> TERRAIN[tiles[k].terrain].passable);
  const seen = new Set();
  const start = passableKeys.find(k=> distance(parseKey(k),{q:0,r:0}) < radius/2) ?? passableKeys[0];
  if(start){
    const q=[start]; seen.add(start);
    while(q.length){
      const cur=q.shift();
      for(const n of neighbors(parseKey(cur)).map(coordKey)){
        if(tiles[n] && TERRAIN[tiles[n].terrain].passable && !seen.has(n)){ seen.add(n); q.push(n); }
      }
    }
  }
  for(const k of passableKeys){ if(!seen.has(k)) tiles[k].terrain='mountain'; }

  // sprinkle features
  for(const t of Object.values(tiles)){
    if(!TERRAIN[t.terrain].passable) continue;
    const roll = seededNoise(seed, t.q, t.r, 4);
    if(roll>0.935 && t.terrain!=='desert') t.feature = {kind:'tree', nextFruitDay:1, ripe:true};
    else if(roll<0.038) t.feature = {kind:'knot', mined:false, amount:2+Math.floor(roll*100)%3};
  }
  return tiles;
}

export function nearestOpenKey(tiles, origin, usedSet, allowFeatureOverwrite=false){
  const keys = Object.keys(tiles).sort((a,b)=> distance(origin, parseKey(a)) - distance(origin, parseKey(b)));
  return keys.find(k=>{
    const t=tiles[k];
    if(usedSet.has(k) || !TERRAIN[t.terrain].passable) return false;
    if(!allowFeatureOverwrite && t.feature?.kind==='base') return false;
    if(!allowFeatureOverwrite && t.feature) return false;
    return true;
  }) ?? coordKey({q:0,r:0});
}
