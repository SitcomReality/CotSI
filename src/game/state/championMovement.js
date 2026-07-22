/**
 * championMovement.js — Walkable range, movement execution, daily moves.
 * Depends on entityQueries, vision, and arrivalInteractions.
 */
import { coordKey, parseKey, neighbors } from '../../engine/rules/hexGrid.js';
import { isBlockedForMovement } from './entityQueries.js';
import { refreshVision } from './fogOfWar.js';
import { interactOnArrival } from './arrivalInteractions.js';

export function movementRange(state, champ) {
  const start = coordKey(champ.pos);
  const costs = { [start]: 0 };
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    const cc = costs[cur];
    for (const n of neighbors(parseKey(cur))) {
      const key = coordKey(n);
      if (isBlockedForMovement(state, key, champ.id)) continue;
      const nc = cc + 1;
      if (nc <= champ.moves && (costs[key] === undefined || nc < costs[key])) {
        costs[key] = nc;
        q.push(key);
      }
    }
  }
  return costs;
}

/**
 * Returns array of hex keys for passable, unblocked tiles adjacent to champ.
 * Used for step-by-step human movement (only 6 neighbor checks, no BFS).
 */
export function adjacentPassable(state, champ) {
  const results = [];
  for (const n of neighbors(champ.pos)) {
    const key = coordKey(n);
    if (!isBlockedForMovement(state, key, champ.id)) {
      results.push(key);
    }
  }
  return results;
}

export function dailyMoves(state, champ) {
  const artifactMove = champ.artifact === 'spur' ? 1 : 0;
  const verdantMove = champ.faction === 2 ? 1 : 0;
  return Math.max(1, Math.floor((champ.baseMove + artifactMove + verdantMove) * state.weather.dayLength));
}

export function moveChampion(state, champ, targetKey, cost) {
  champ.pos = parseKey(targetKey);
  champ.moves = Math.max(0, champ.moves - cost);
  champ.lastActionCombat = false;
  interactOnArrival(state, champ);
  refreshVision(state);
}