/**
 * traderMovement.js — Trader movement AI.
 *
 * Each trader moves toward its target base each world turn, stepping through
 * tiles it can enter while its daily action-point pool lasts
 * (dev/docs/movementDesign.md §11). Traders use the base terrain ladder only.
 */
import { coordKey, parseKey, neighbors, distance } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { terrainCost, isTerrainBlocked } from '../rules/movementCosts.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader } from './entityQueries.js';
import { updateSpatialIndex } from './spatialIndex.js';
import { TRADER_DAILY_AP } from '../../params/game/spawnParams.js';

/**
 * Run the trader movement phase.
 * Each trader refills its AP pool and moves greedily toward its target base,
 * spending the effective cost of each hex entered, until the pool runs out,
 * the way is blocked, or it arrives (then picks a new random base target).
 * @param {object} state - Game state
 */
export function runTraderMovement(state) {
  for (const tr of state.traders) {
    tr.actionPoints = TRADER_DAILY_AP;
    while (tr.actionPoints > 0) {
      // Movement target is the base's coordinates. (Reading the tile object
      // here would make every distance NaN — tiles have no q/r fields.)
      const target = parseKey(tr.targetBaseKey) || tr.pos;
      // Pick the hex neighbor that moves closest to the target.
      // Using neighbors() ensures we only step in valid axial directions,
      // unlike the old Cartesian dx/dy which could produce illegal (+1,+1).
      const nbrs = neighbors(tr.pos);
      let bestNbr = null;
      let bestDist = Infinity;
      for (const nbr of nbrs) {
        const d = distance(nbr, target);
        if (d < bestDist) { bestDist = d; bestNbr = nbr; }
      }
      const nk = bestNbr ? coordKey(bestNbr) : '';
      const tile = state.tiles[nk];
      if (!bestNbr || !tile || isTerrainBlocked(tr, tile.terrain) || tile.feature ||
          occupiedByChampion(state, nk) || occupiedByMob(state, nk) || occupiedByTrader(state, nk)) {
        break; // blocked — wait out the day
      }
      const cost = terrainCost(tr, tile.terrain);
      if (cost > tr.actionPoints) break; // cannot afford the next step
      const oldKey = coordKey(tr.pos);
      tr.pos = { q: bestNbr.q, r: bestNbr.r };
      tr.actionPoints -= cost;
      updateSpatialIndex(state, oldKey, coordKey(tr.pos), tr, 'trader');
      if (nk === tr.targetBaseKey) {
        // pick new base from the pre-built base index
        const bases = [...(state._baseKeys || [])];
        tr.targetBaseKey = bases.length > 0
          ? bases[Math.floor(state._rng() * bases.length)]
          : nk;
        break;
      }
    }
  }
}
