/**
 * basePlacer.js — Tile search for faction base placement with fallback chain.
 * Finds a suitable hex for each faction's base, enforcing inter-base distance.
 */
import { distance, parseKey, coordKey, hexRing } from '../../engine/rules/hexGrid.js';
import {
  nearestOpenKey,
  nearestOpenMultiRing,
} from '../rules/tileQueries.js';
import { TERRAIN } from '../rules/terrainTypes.js';

const MIN_BASE_DIST = 2;

/**
 * Find a base tile for a champion, searching outward from target.
 *
 * @param {Object} tiles          - The generated tile map keyed by "q,r"
 * @param {Object} target         - Preferred axial coordinate { q, r }
 * @param {Set}   used           - Set of already-claimed hex keys
 * @param {Set}   placedBaseKeys - Set of faction base hex keys
 * @returns {string} The chosen hex key
 */
export function placeBase(tiles, target, used, placedBaseKeys) {
  const minDist = MIN_BASE_DIST;

  // Primary: ring-expanding search from target
  const checkBase = (tile, key) => {
    if (!tile || !TERRAIN[tile.terrain].passable || used.has(key) || tile.feature) return false;
    for (const placedKey of placedBaseKeys) {
      if (distance(parseKey(key), parseKey(placedKey)) < minDist) return false;
    }
    return true;
  };

  // Check origin first
  const originKey = coordKey(target);
  let tile = tiles[originKey];
  if (checkBase(tile, originKey)) return originKey;

  for (let d = 1; d <= 100; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + target.q, r: c.r + target.r });
      tile = tiles[ck];
      if (checkBase(tile, ck)) return ck;
    }
  }

  // Fallback 1: ring-search ignoring inter-base distance
  for (let d = 1; d <= 100; d++) {
    const ring = hexRing(d);
    for (const c of ring) {
      const ck = coordKey({ q: c.q + target.q, r: c.r + target.r });
      tile = tiles[ck];
      if (tile && TERRAIN[tile.terrain].passable && !used.has(ck) && !tile.feature) return ck;
    }
  }

  // Fallback 2: nearestOpenMultiRing then nearestOpenKey from origin
  return nearestOpenMultiRing(tiles, { q: 0, r: 0 }, used, 1)
    ?? nearestOpenKey(tiles, { q: 0, r: 0 }, used, true);
}
