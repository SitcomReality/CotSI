/**
 * pathfinding.js — Generic BFS/A* pathfinding on axial hex grids.
 * Pure: no game-state knowledge, no side effects.
 *
 * The caller supplies a `canEnter(key, isTarget)` callback that encapsulates
 * all game-specific passability and occupancy checks (BFS), or a
 * `stepCost(key)` callback returning the AP cost of entering a hex, with
 * Infinity for blocked (weighted A*).
 */
import { coordKey, parseKey, neighbors, distance } from './hexGrid.js';

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

/**
 * Weighted A* pathfinding. Each hex costs `stepCost(key)` AP to enter;
 * Infinity marks a blocked hex. Returns the lowest-total-cost path
 * (array of {q,r}) from start to target, or null when unreachable.
 *
 * The heuristic is axial hex distance — admissible because every enterable
 * hex costs ≥ 1 AP — so the result is optimal for any positive costs.
 *
 * The search is only bounded by `stepCost`: it MUST return Infinity for
 * hexes outside the map/world (missing tiles), otherwise an unreachable
 * target on an unbounded plane never terminates.
 *
 * @param {number} sx, sy  – start axial coords
 * @param {number} tx, ty  – target axial coords
 * @param {(key: string) => number} stepCost – AP cost to enter a hex (Infinity = blocked)
 * @returns {Array<{q:number,r:number}>|null} path start→target ([] when target === start)
 */
export function weightedFindPath(sx, sy, tx, ty, stepCost) {
  const start = `${sx},${sy}`, target = `${tx},${ty}`;
  if (start === target) return [];

  // gScore: best known cost to each hex; came: predecessor map.
  const gScore = new Map([[start, 0]]);
  const came = new Map();
  const closed = new Set();

  // Binary min-heap of [fScore, key].
  const heap = [[distance({ q: sx, r: sy }, { q: tx, r: ty }), start]];

  const push = (key) => {
    const f = gScore.get(key) + distance(parseKey(key), { q: tx, r: ty });
    heap.push([f, key]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top[1];
  };

  while (heap.length) {
    const cur = pop();
    if (cur === target) break;
    if (closed.has(cur)) continue;
    closed.add(cur);
    const g = gScore.get(cur);
    const { q: x, r: y } = parseKey(cur);
    for (const n of neighbors({ q: x, r: y })) {
      const key = coordKey(n);
      if (closed.has(key)) continue;
      const cost = stepCost(key);
      if (!Number.isFinite(cost)) continue;
      const ng = g + cost;
      if (ng < (gScore.get(key) ?? Infinity)) {
        gScore.set(key, ng);
        came.set(key, cur);
        push(key);
      }
    }
  }
  if (!came.has(target)) return null;
  const path = [];
  let cur = target;
  while (cur && cur !== start) { path.unshift(parseKey(cur)); cur = came.get(cur); }
  return path;
}
