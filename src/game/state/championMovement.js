/**
 * movement.js — Walkable range, movement execution, daily moves, arrival interactions.
 * Depends on entityQueries and vision.
 */
import { coordKey, parseKey, neighbors } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainGeneration.js';
import { isBlockedForMovement } from './entityQueries.js';
import { refreshVision } from './fogOfWar.js';
import { addLog } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';

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

export function interactOnArrival(state, champ) {
  const tile = state.tiles[coordKey(champ.pos)];
  if (tile.feature?.kind === 'tree' && tile.feature.ripe !== false) {
    if (!tile.feature.nextFruitDay || state.day >= tile.feature.nextFruitDay) {
      const heal = champ.faction === 2 ? 34 : 18;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      tile.feature.nextFruitDay = state.day + 4;
      tile.feature.ripe = false;
      addLog(state, `${champ.name} eats manuscript fruit (+${heal} HP).`);
      recordLedgerEntry(champ, `+${heal} HP — manuscript fruit`, 'gain', 'hp');
    }
  }
  if (tile.feature?.kind === 'knot' && !tile.feature.mined) {
    const amt = tile.feature.amount || 2;
    champ.knot += amt;
    tile.feature.mined = true;
    addLog(state, `${champ.name} mines ${amt} God's Knot.`);
    recordLedgerEntry(champ, `+${amt} God's Knot — mined`, 'gain', 'knot');
    tile.feature = null;
  }
}

export function moveChampion(state, champ, targetKey, cost) {
  champ.pos = parseKey(targetKey);
  champ.moves = Math.max(0, champ.moves - cost);
  champ.lastActionCombat = false;
  interactOnArrival(state, champ);
  refreshVision(state);
}