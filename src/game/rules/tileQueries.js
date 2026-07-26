/**
 * tileQueries.js — Spawn-placement helpers that query the tile map.
 * Uses hex-grid math from engine/rules/hexGrid.js and TERRAIN from terrainTypes.js.
 */
import { coordKey, hexRing, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';
import { MAX_SPAWN_SEARCH_RINGS } from '../../params/game/spawnParams.js';

/**
 * Find the closest passable, unclaimed hex to `origin`.
 *
 * @param {Object} tiles              - Map tile dict
 * @param {{q:number,r:number}} origin - Center to search from
 * @param {Set<string>} usedSet       - Already-claimed hex keys
 * @param {boolean} [allowFeatureOverwrite=false] - Allow placing on tiles with features
 * @returns {string}                   - Hex key (falls back to 0,0)
 */
export function nearestOpenKey(tiles, origin, usedSet, allowFeatureOverwrite = false) {
  if (!origin) origin = { q: 0, r: 0 };
  // Check origin first
  const originKey = coordKey(origin);
  const originTile = tiles[originKey];
  if (originTile && TERRAIN[originTile.terrain].passable &&
      !usedSet.has(originKey) &&
      (allowFeatureOverwrite || !originTile.feature)) {
    return originKey;
  }
  // Expand outward in rings
  for (let d = 1; d <= MAX_SPAWN_SEARCH_RINGS; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + origin.q, r: c.r + origin.r });
      const t = tiles[ck];
      if (!t || !TERRAIN[t.terrain].passable || usedSet.has(ck)) continue;
      if (!allowFeatureOverwrite && t.feature) continue;
      return ck;
    }
  }
  return coordKey({ q: 0, r: 0 });
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
  if (!origin) origin = { q: 0, r: 0 };
  // Pre-compute the offset list for the clear radius check (same for every candidate)
  const clearOffsets = hexesWithinRadius(minClearRadius);

  // Check origin first
  const originKey = coordKey(origin);
  const originTile = tiles[originKey];
  if (originTile && TERRAIN[originTile.terrain].passable && !usedSet.has(originKey) && !originTile.feature) {
    let clear = true;
    for (const off of clearOffsets) {
      const nk = coordKey({ q: off.q + origin.q, r: off.r + origin.r });
      const nt = tiles[nk];
      if (!nt || !TERRAIN[nt.terrain].passable || usedSet.has(nk) || nt.feature) {
        clear = false;
        break;
      }
    }
    if (clear) return originKey;
  }

  // Expand outward in rings
  for (let d = 1; d <= MAX_SPAWN_SEARCH_RINGS; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + origin.q, r: c.r + origin.r });
      const t = tiles[ck];
      if (!t || !TERRAIN[t.terrain].passable || usedSet.has(ck) || t.feature) continue;

      let clear = true;
      for (const off of clearOffsets) {
        const nk = coordKey({ q: off.q + t.q, r: off.r + t.r });
        const nt = tiles[nk];
        if (!nt || !TERRAIN[nt.terrain].passable || usedSet.has(nk) || nt.feature) {
          clear = false;
          break;
        }
      }
      if (clear) return ck;
    }
  }
  return null;
}
