/**
 * traderMovement.js — Trader movement AI.
 *
 * Each trader moves toward its target base each world turn,
 * pathfinding through passable tiles with no features.
 */
import { coordKey, parseKey, neighbors, distance } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader } from './entityQueries.js';
import { updateSpatialIndex } from './spatialIndex.js';

/**
 * Run the trader movement phase.
 * Each trader moves up to `movesPerDay` steps toward its target base,
 * avoiding obstacles and other entities. When reaching a base, picks
 * a new random base target.
 * @param {object} state - Game state
 */
export function runTraderMovement(state) {
  for (const tr of state.traders) {
    for (let s = 0; s < tr.movesPerDay; s++) {
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
      if (bestNbr && state.tiles[nk] && TERRAIN[state.tiles[nk].terrain].passable && !state.tiles[nk].feature && !occupiedByChampion(state, nk) && !occupiedByMob(state, nk) && !occupiedByTrader(state, nk)) {
        const oldKey = coordKey(tr.pos);
        tr.pos = { q: bestNbr.q, r: bestNbr.r };
        updateSpatialIndex(state, oldKey, coordKey(tr.pos), tr, 'trader');
      }
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
