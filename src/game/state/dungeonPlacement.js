/**
 * dungeonPlacement.js — Dungeon feature placement at game start.
 *
 * Places `dungeonCountForRadius(radius)` dungeons on passable, unclaimed,
 * feature-less tiles, spread out from each other and inside a center-distance
 * band (not on the spawn clearings, not on the map rim). Placement only sees
 * the materialized starting region (same as mobs/traders), so on large maps
 * dungeons appear in the band of generated chunks around the spawns.
 *
 * Layer: game/state — mutates tiles; may import engine, game/rules, itself.
 */
import { parseKey, distance } from '../../engine/rules/hexGrid.js';
import { collectSpawnCandidates } from '../rules/tileQueries.js';
import { dungeonCountForRadius } from '../rules/dungeonRules.js';
import {
  DUNGEON_MIN_CENTER_DIST_FLOOR,
  DUNGEON_MIN_CENTER_DIST_FRACTION,
  DUNGEON_EDGE_MARGIN,
  DUNGEON_MIN_SPACING_FLOOR,
  DUNGEON_MIN_SPACING_FRACTION,
} from '../../params/game/dungeonParams.js';

const CENTER = { q: 0, r: 0 };

/**
 * Place dungeons on the tile map.
 * @param {Object}   params.tiles  - Tile map keyed by "q,r"
 * @param {Function} params.rand   - Seeded RNG function returning [0, 1)
 * @param {Set}      params.used   - Set of claimed hex keys (mutated in place)
 * @param {number}   params.radius - Map radius in hexes
 * @returns {string[]} the placed dungeon hex keys
 */
export function placeDungeons({ tiles, rand, used, radius }) {
  const count = dungeonCountForRadius(radius);
  const candidates = collectSpawnCandidates(tiles).filter(
    (k) => !tiles[k].feature && !used.has(k)
  );

  const minCenter = Math.max(DUNGEON_MIN_CENTER_DIST_FLOOR, Math.floor(radius * DUNGEON_MIN_CENTER_DIST_FRACTION));
  const maxCenter = Math.max(minCenter + 1, radius - DUNGEON_EDGE_MARGIN);
  const spacing = Math.max(DUNGEON_MIN_SPACING_FLOOR, Math.floor(radius * DUNGEON_MIN_SPACING_FRACTION));

  // Prefer the center-distance band; relax to every candidate on small maps
  // where the band may be fully claimed by spawn clearings.
  let pool = candidates.filter((k) => {
    const d = distance(CENTER, parseKey(k));
    return d >= minCenter && d <= maxCenter;
  });
  if (pool.length < count) pool = candidates;

  const keys = [];
  while (keys.length < count && pool.length > 0) {
    const eligible = pool.filter(
      (k) => keys.every((ek) => distance(parseKey(ek), parseKey(k)) >= spacing)
    );
    const source = eligible.length > 0 ? eligible : pool;
    const key = source[Math.floor(rand() * source.length)];
    pool = pool.filter((k) => k !== key);
    keys.push(key);
  }

  for (const key of keys) {
    tiles[key].feature = { kind: 'dungeon' };
    used.add(key);
  }
  return keys;
}
