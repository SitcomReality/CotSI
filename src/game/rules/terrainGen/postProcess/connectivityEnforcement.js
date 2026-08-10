import { coordKey, neighbors } from '../../../../engine/rules/hexGrid.js';
import { createMinHeap } from '../../../../engine/rules/binaryHeap.js';
import { TERRAIN } from '../../terrainTypes.js';
import { demoteToPassable } from './spawnClearance.js';

// Terrain-cost weights for connectivity bridging.
// Lower cost = more natural bridge point. Dijkstra minimizes total cost.
const BRIDGE_COST = {
  water: 1,
  ice: 1,
  mountain: 2,
};

/**
 * Ensure all passable hexes form a single connected component.
 *
 * 1. Flood-fill from the center (or first passable hex) to find the main
 *    passable component.
 * 2. For any isolated passable pockets, run Dijkstra on the full hex graph
 *    (passable + impassable) to find the minimum-cost bridge to the main
 *    component.
 * 3. Convert bridged impassable hexes via demoteToPassable, clear features.
 *
 * @param {object} tiles  - Flat tile map keyed by "q,r"
 * @param {number} radius - Map radius in hexes
 */
export function ensurePassableConnectivity(tiles, radius) {
  const allKeys = Object.keys(tiles);
  if (allKeys.length === 0) return;

  // 1. Collect passable hex keys
  const passableSet = new Set();
  for (const key of allKeys) {
    const tile = tiles[key];
    if (tile && TERRAIN[tile.terrain]?.passable) {
      passableSet.add(key);
    }
  }
  if (passableSet.size === 0) return;

  // 2. BFS through passable hexes from the center to find the main component
  const centerKey = '0,0';
  const mainComponent = new Set();
  const seedKey = passableSet.has(centerKey) ? centerKey : passableSet.values().next().value;

  const bfsVisited = new Set();
  const queue = [seedKey];
  bfsVisited.add(seedKey);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (passableSet.has(cur)) {
      mainComponent.add(cur);
      const [cq, cr] = cur.split(',').map(Number);
      for (const nbr of neighbors({ q: cq, r: cr })) {
        const nk = coordKey(nbr);
        if (bfsVisited.has(nk)) continue;
        bfsVisited.add(nk);
        if (passableSet.has(nk)) {
          queue.push(nk);
        }
      }
    }
  }

  // All passable hexes already in the main component? Done.
  if (mainComponent.size >= passableSet.size) return;

  // 3. Find isolated passable components
  const isolated = [];
  for (const key of passableSet) {
    // Skip everything already visited — the main component AND components
    // isolated in an earlier pass. They live in bfsVisited, not mainComponent:
    // mainComponent must stay clean so the Dijkstra in _bridgeComponent can
    // terminate on it.
    if (bfsVisited.has(key)) continue;

    const comp = new Set();
    const q2 = [key];
    const vis2 = new Set();
    vis2.add(key);

    while (q2.length > 0) {
      const cur2 = q2.shift();
      comp.add(cur2);
      bfsVisited.add(cur2);  // mark globally visited
      const [cq, cr] = cur2.split(',').map(Number);
      for (const nbr of neighbors({ q: cq, r: cr })) {
        const nk = coordKey(nbr);
        if (vis2.has(nk)) continue;
        vis2.add(nk);
        if (passableSet.has(nk) && !bfsVisited.has(nk)) {
          q2.push(nk);
        }
      }
    }
    if (comp.size > 0) isolated.push(comp);
  }

  // 4. Bridge each isolated component to the main component
  for (const comp of isolated) {
    _bridgeComponent(tiles, comp, mainComponent);
  }
}

/**
 * Dijkstra-search a minimum-cost bridge from an isolated passable component
 * to the main component, then convert impassable hexes on the path.
 *
 * Uses a min-heap priority queue (binaryHeap.js) instead of a linear min-scan,
 * so worst-case per pocket is O(V log V) rather than O(V²).
 */
function _bridgeComponent(tiles, isolatedSet, mainSet) {
  // Pick a seed from the isolated component
  const seed = isolatedSet.values().next().value;

  const dist = {};
  const prev = {};
  dist[seed] = 0;

  // Duplicate-entry heap: a key may be pushed again when a shorter path is
  // found; stale pops (priority > current dist) are skipped below.
  const heap = createMinHeap();
  heap.push(seed, 0);

  let reachedTarget = null;

  while (!heap.isEmpty()) {
    const { key: minKey, priority: minDist } = heap.pop();

    // Stale entry — a shorter path to this key was found after this push
    if (minDist > dist[minKey]) continue;

    // Reached main component?
    if (mainSet.has(minKey)) {
      reachedTarget = minKey;
      break;
    }

    // Relax neighbors
    const [cq, cr] = minKey.split(',').map(Number);
    for (const nbr of neighbors({ q: cq, r: cr })) {
      const nk = coordKey(nbr);
      if (!tiles[nk]) continue;

      const nbrTile = tiles[nk];
      const isPassable = TERRAIN[nbrTile.terrain]?.passable;
      const edgeCost = isPassable ? 0 : (BRIDGE_COST[nbrTile.terrain] ?? 100);

      const alt = minDist + edgeCost;
      if (alt < (dist[nk] ?? Infinity)) {
        dist[nk] = alt;
        prev[nk] = minKey;
        heap.push(nk, alt);
      }
    }
  }

  if (reachedTarget === null) return;

  // Backtrack from reached target, converting impassable hexes on the path
  let cur = reachedTarget;
  while (cur !== null && cur !== seed) {
    const tile = tiles[cur];
    if (tile && !TERRAIN[tile.terrain]?.passable) {
      tile.terrain = demoteToPassable(tile.terrain);
      tile.feature = null;
    }
    cur = prev[cur];
  }
}
