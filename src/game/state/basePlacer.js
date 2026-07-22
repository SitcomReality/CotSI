/**
 * basePlacer.js — Tile search for faction base placement with fallback chain.
 * Finds a suitable hex for each faction's base, enforcing inter-base distance.
 */
import { distance, parseKey } from '../../engine/rules/hexGrid.js';
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
  const sortedKeys = Object.keys(tiles).sort(
    (a, b) => distance(target, parseKey(a)) - distance(target, parseKey(b))
  );

  // Primary: nearest passable tile meeting inter-base distance
  let baseKey = sortedKeys.find(k => {
    const t = tiles[k];
    if (used.has(k) || !TERRAIN[t.terrain].passable) return false;
    if (t.feature) return false;
    for (const placedKey of placedBaseKeys) {
      if (distance(parseKey(k), parseKey(placedKey)) < MIN_BASE_DIST) {
        return false;
      }
    }
    return true;
  }) ?? null;

  // Fallback 1: nearest open tile ignoring inter-base distance
  if (!baseKey) {
    baseKey = sortedKeys.find(k => {
      const t = tiles[k];
      return !used.has(k) && TERRAIN[t.terrain].passable && !t.feature;
    }) ?? null;
  }

  // Fallback 2: nearest open tile from origin
  if (!baseKey) {
    baseKey = nearestOpenMultiRing(tiles, { q: 0, r: 0 }, used, 1)
      ?? nearestOpenKey(tiles, { q: 0, r: 0 }, used, true);
  }

  return baseKey;
}
