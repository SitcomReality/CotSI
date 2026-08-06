/**
 * basePlacer.js — Tile search for faction base placement with fallback chain.
 * Finds a suitable hex for each faction's base, enforcing inter-base distance.
 *
 * All tile reads are guarded by the optional `materialized` key set so the
 * ring searches never trigger lazy chunk generation — placement cost is
 * bounded by the eager starting region, never the map radius.
 */
import { distance, parseKey, coordKey, hexRing } from '../../engine/rules/hexGrid.js';
import {
  nearestOpenKey,
} from '../rules/tileQueries.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { BASE_SEARCH_MAX_RING } from '../../params/game/spawnParams.js';

/**
 * Find a base tile for a champion, searching outward from target.
 *
 * @param {Object} tiles          - The generated tile map keyed by "q,r"
 * @param {Object} target         - Preferred axial coordinate { q, r }
 * @param {Set}   used           - Set of already-claimed hex keys
 * @param {Set}   placedBaseKeys - Set of faction base hex keys
 * @param {number} minDist       - Minimum hex distance between bases
 * @param {Set<string>} [materialized] - Keys that exist without generating chunks
 * @returns {string} The chosen hex key
 */
export function placeBase(tiles, target, used, placedBaseKeys, minDist, materialized = null) {

  // Primary: ring-expanding search from target
  const checkBase = (tile, key) => {
    if (!tile || !TERRAIN[tile.terrain].passable || TERRAIN[tile.terrain].avoidSpawn || used.has(key) || tile.feature) return false;
    for (const placedKey of placedBaseKeys) {
      if (distance(parseKey(key), parseKey(placedKey)) < minDist) return false;
    }
    return true;
  };

  // Check origin first
  const originKey = coordKey(target);
  let tile = !materialized || materialized.has(originKey) ? tiles[originKey] : undefined;
  if (checkBase(tile, originKey)) return originKey;

  for (let d = 1; d <= BASE_SEARCH_MAX_RING; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + target.q, r: c.r + target.r });
      if (materialized && !materialized.has(ck)) continue;
      tile = tiles[ck];
      if (checkBase(tile, ck)) return ck;
    }
  }

  // Fallback 1: ring-search ignoring inter-base distance
  for (let d = 1; d <= BASE_SEARCH_MAX_RING; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + target.q, r: c.r + target.r });
      if (materialized && !materialized.has(ck)) continue;
      tile = tiles[ck];
      if (tile && TERRAIN[tile.terrain].passable && !TERRAIN[tile.terrain].avoidSpawn && !used.has(ck) && !tile.feature) return ck;
    }
  }

  // Fallback 2: nearest materialized passable hex to the origin
  return nearestOpenKey(tiles, { q: 0, r: 0 }, used, true, materialized);
}
