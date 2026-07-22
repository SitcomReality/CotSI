/**
 * pathfinding.js — Generic BFS pathfinding on axial hex grids.
 * Pure: no game-state knowledge, no side effects.
 *
 * The caller supplies a `canEnter(key, isTarget)` callback that encapsulates
 * all game-specific passability and occupancy checks.
 */
import { coordKey, parseKey, neighbors } from './hexGrid.js';

export function findPath(sx, sy, tx, ty, champId, canEnter) {
  const start = `${sx},${sy}`, target = `${tx},${ty}`;
  const came = new Map([[start, null]]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    if (cur === target) break;
    const { q: x, r: y } = parseKey(cur);
    for (const n of neighbors({ q: x, r: y })) {
      const key = coordKey(n);
      if (came.has(key)) continue;
      if (!canEnter(key, key === target)) continue;
      came.set(key, cur);
      q.push(key);
    }
  }
  if (!came.has(target)) return null;
  const path = [];
  let cur = target;
  while (cur && cur !== start) { path.unshift(parseKey(cur)); cur = came.get(cur); }
  return path;
}
