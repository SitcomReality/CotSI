/**
 * championMovement.js — Action-point range, path reconstruction, daily AP,
 * movement execution. Depends on entityQueries, vision, and arrivalInteractions.
 *
 * Movement is budgeted in action points (AP) per dev/docs/movementAndOccupation.md:
 * every hex has a terrain cost (movementCosts.js); `movementRange` is a
 * weighted shortest-path search over effective costs capped by the
 * champion's AP pool.
 */
import { coordKey, parseKey, neighbors } from '../../engine/rules/hexGrid.js';
import { weightedFindPath } from '../../engine/rules/pathfinding.js';
import { isBlockedForMovement, canChampionEnter } from './entityQueries.js';
import { terrainCost } from '../rules/movementCosts.js';
import { refreshVision } from './fogOfWar.js';
import { interactOnArrival } from './arrivalInteractions.js';
import { updateSpatialIndex } from './spatialIndex.js';
import { SPUR_AP_BONUS, MIN_DAILY_AP } from '../../params/game/championParams.js';

/**
 * Weighted reachability from the champion's hex within its action-point pool.
 * FIFO relaxation with re-push on improvement — provably optimal for the
 * non-negative cost ladder (every parent improvement re-relaxes its
 * children), and cheaper than a heap at these range sizes.
 * @param {object} state
 * @param {object} champ
 * @returns {{ costs: Map<string, number>, cameFrom: Map<string, string> }}
 *   costs: hex key → total AP to reach it; cameFrom: hex key → previous key
 *   on the cheapest path (absent for the start hex).
 */
export function movementRange(state, champ) {
  const start = coordKey(champ.pos);
  const costs = new Map([[start, 0]]);
  const cameFrom = new Map();
  const q = [start];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const cc = costs.get(cur);
    for (const n of neighbors(parseKey(cur))) {
      const key = coordKey(n);
      if (isBlockedForMovement(state, key, champ)) continue;
      const nc = cc + terrainCost(champ, state.tiles[key].terrain, state.tiles[key].biomeId);
      if (nc <= champ.actionPoints && (costs.get(key) === undefined || nc < costs.get(key))) {
        costs.set(key, nc);
        cameFrom.set(key, cur);
        // Feature hexes (fruit, knots, chests, …) are destinations only —
        // routes never pass through them, so a walk's outcome always matches
        // its preview (no mid-walk harvesting).
        if (!state.tiles[key].feature) q.push(key);
      }
    }
  }
  return { costs, cameFrom };
}

/**
 * Reconstruct the cheapest path (hex keys, start → target) from a
 * movementRange result by walking `cameFrom` backwards from the target.
 * @param {{ cameFrom: Map<string, string> }} range
 * @param {string} targetKey
 * @returns {string[]} hex keys along the path (empty when target === start)
 */
export function pathToKey(range, targetKey) {
  const path = [];
  let cur = targetKey;
  while (cur !== undefined && range.cameFrom.has(cur)) {
    path.unshift(cur);
    cur = range.cameFrom.get(cur);
  }
  return path;
}

/**
 * The walkable path toward a target hex: the cheapest in-budget path when the
 * hex is reachable, otherwise the longest affordable prefix of the A* route
 * toward it (dev/docs/movementAndOccupation.md §5, §6). Shared by the
 * click-to-preview and commit paths, so the previewed route always matches
 * the walked route. Feature hexes are destination-only (never routed
 * through), matching movementRange. Returns null when no path exists at all.
 *
 * @param {object} state
 * @param {object} champ
 * @param {string} targetKey
 * @param {{costs: Map, cameFrom: Map}} [range] — precomputed movementRange
 * @returns {{ path: string[], cost: number } | null}
 */
export function pathToward(state, champ, targetKey, range = movementRange(state, champ)) {
  if (range.costs.has(targetKey)) {
    return { path: pathToKey(range, targetKey), cost: range.costs.get(targetKey) };
  }
  const t = parseKey(targetKey);
  const full = weightedFindPath(champ.pos.q, champ.pos.r, t.q, t.r, (key) => {
    const tile = state.tiles[key];
    if (!tile) return Infinity;
    if (key !== targetKey && tile.feature) return Infinity; // destinations only
    return canChampionEnter(state, key, champ) ? terrainCost(champ, tile.terrain, tile.biomeId) : Infinity;
  });
  if (!full || !full.length) return null;
  const path = [];
  let budget = champ.actionPoints;
  for (const hex of full) {
    const key = coordKey(hex);
    const cost = terrainCost(champ, state.tiles[key].terrain, state.tiles[key].biomeId);
    // cost <= 0 would walk without spending AP — disallowed by the ladder
    // (every cost ≥ 1); guard so callers can never loop on free steps.
    if (cost <= 0 || cost > budget) break;
    budget -= cost;
    path.push(key);
  }
  if (!path.length) return null;
  return { path, cost: champ.actionPoints - budget };
}

/**
 * Daily action-point pool for a champion: (base + artifact bonuses) scaled by
 * day length, floored at MIN_DAILY_AP.
 * @param {object} state
 * @param {object} champ
 * @returns {number}
 */
export function dailyActionPoints(state, champ) {
  const artifactAp = champ.artifact === 'spur' ? SPUR_AP_BONUS : 0;
  return Math.max(MIN_DAILY_AP, Math.floor((champ.baseActionPoints + artifactAp) * state.weather.dayLength));
}

/**
 * Move a champion onto a hex, spending `cost` action points.
 * @param {object} state
 * @param {object} champ
 * @param {string} targetKey
 * @param {number} cost — AP cost of the target hex (terrainCost)
 */
export function moveChampion(state, champ, targetKey, cost) {
  const oldKey = coordKey(champ.pos);
  champ.pos = parseKey(targetKey);
  champ.actionPoints = Math.max(0, champ.actionPoints - cost);
  champ.lastActionCombat = false;
  interactOnArrival(state, champ);
  refreshVision(state);
  updateSpatialIndex(state, oldKey, targetKey, champ, 'champion');
}
