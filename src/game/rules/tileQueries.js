/**
 * tileQueries.js — Spawn-placement helpers that query the tile map.
 * Uses hex-grid math from engine/rules/hexGrid.js and TERRAIN from terrainTypes.js.
 */
import { coordKey, parseKey, distance } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';

/**
 * Find the closest passable, unclaimed hex to `origin`.
 *
 * @param {Object} tiles              - Map tile dict
 * @param {{q:number,r:number}} origin - Center to search from
 * @param {Set<string>} usedSet       - Already-claimed hex keys
 * @param {boolean} [allowFeatureOverwrite=false] - Allow placing on tiles with features
 * @returns {string}                   - Hex key (falls back to 0,0)
 */
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

/**
 * Find the closest passable hex to `origin` that has at least `minClearRadius`
 * rings of empty, passable, unclaimed hexes around it (including the center).
 *
 * Used for spawn placement: guarantees a clearing of vacant tiles around a
 * faction base.
 *
 * @param {Object} tiles              - Map tile dict
 * @param {{q:number,r:number}} origin - Center to search from
 * @param {Set<string>} usedSet       - Already-claimed hex keys
 * @param {number} minClearRadius     - Minimum clear radius in hexes (1 = center only, 2 = center + 1 ring, etc.)
 * @returns {string|null}             - Hex key, or null if none found
 */
export function nearestOpenMultiRing(tiles, origin, usedSet, minClearRadius = 2) {
  const keys = Object.keys(tiles).sort(
    (a, b) => distance(origin, parseKey(a)) - distance(origin, parseKey(b))
  );

  for (const candidateKey of keys) {
    const candidate = parseKey(candidateKey);
    if (!TERRAIN[tiles[candidateKey].terrain].passable) continue;

    // Check all hexes within clear radius are passable and not claimed
    let clear = true;
    for (const tileKey of Object.keys(tiles)) {
      if (distance(candidate, parseKey(tileKey)) > minClearRadius) continue;
      const t = tiles[tileKey];
      if (!TERRAIN[t.terrain].passable || usedSet.has(tileKey) || t.feature) {
        clear = false;
        break;
      }
    }
    if (clear) return candidateKey;
  }
  return null; // No suitable location found
}
