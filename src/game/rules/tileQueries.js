/**
 * tileQueries.js — Spawn-placement helpers that query the tile map.
 * Uses hex-grid math from engine/rules/hexGrid.js and TERRAIN from terrainTypes.js.
 *
 * All reads are guarded by an optional `materialized` key set so a search can
 * never trigger lazy chunk generation (state.tiles auto-generates missing
 * chunks on read). Spawn placement cost is bounded by the eager starting
 * region, never the map radius.
 */
import { coordKey, hexRing } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';
import { MAX_SPAWN_SEARCH_RINGS } from '../../params/game/spawnParams.js';

/**
 * Collect every materialized, spawn-eligible hex key (passable, not
 * avoidSpawn) from the tile map. Only reads tiles that already exist, so the
 * result is safe to look up without triggering lazy chunk generation.
 * Feature and used-hex filtering is left to the caller.
 *
 * @param {Object} tiles - Tile map (chunk-backed proxy or plain dict)
 * @returns {string[]} Materialized spawn-eligible hex keys
 */
export function collectSpawnCandidates(tiles) {
  const out = [];
  for (const key of Object.keys(tiles)) {
    const t = tiles[key];
    if (t && TERRAIN[t.terrain].passable && !TERRAIN[t.terrain].avoidSpawn) out.push(key);
  }
  return out;
}

/**
 * Find the closest passable, unclaimed hex to `origin`, searching outward in
 * rings. When `materialized` is provided, hexes outside it are skipped so the
 * search never generates chunks.
 *
 * @param {Object} tiles              - Map tile dict
 * @param {{q:number,r:number}} origin - Center to search from
 * @param {Set<string>} usedSet       - Already-claimed hex keys
 * @param {boolean} [allowFeatureOverwrite=false] - Allow placing on tiles with features
 * @param {Set<string>} [materialized] - Keys that exist without generating chunks
 * @returns {string}                   - Hex key (falls back to 0,0)
 */
export function nearestOpenKey(tiles, origin, usedSet, allowFeatureOverwrite = false, materialized = null) {
  if (!origin) origin = { q: 0, r: 0 };
  // Check origin first
  const originKey = coordKey(origin);
  const originTile = !materialized || materialized.has(originKey) ? tiles[originKey] : undefined;
  if (originTile && TERRAIN[originTile.terrain].passable &&
      !TERRAIN[originTile.terrain].avoidSpawn &&
      !usedSet.has(originKey) &&
      (allowFeatureOverwrite || !originTile.feature)) {
    return originKey;
  }
  // Expand outward in rings
  for (let d = 1; d <= MAX_SPAWN_SEARCH_RINGS; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + origin.q, r: c.r + origin.r });
      if (materialized && !materialized.has(ck)) continue;
      const t = tiles[ck];
      if (!t || !TERRAIN[t.terrain].passable || TERRAIN[t.terrain].avoidSpawn || usedSet.has(ck)) continue;
      if (!allowFeatureOverwrite && t.feature) continue;
      return ck;
    }
  }
  return coordKey({ q: 0, r: 0 });
}
