import { coordKey } from '../../../../engine/rules/hexGrid.js';
import { SPAWN_CLEARANCE_RING } from '../../../../params/game/spawnParams.js';

/** Terrain demotion table for forcing passability. */
const PASSEABLE_DEMOTION = {
  water: 'marsh',
  ice: 'plains',
  mountain: 'hill',
  peak: 'hill',
  floatingIsland: 'hill',
};

export { PASSEABLE_DEMOTION };

export function demoteToPassable(terrain) {
  return PASSEABLE_DEMOTION[terrain] || terrain;
}

/**
 * Force passable terrain + clear features/debris around each faction spawn target.
 * Runs after all chunks are assembled, before champion placement.
 *
 * @param {object}  tiles        - Flat tile map keyed by "q,r"
 * @param {number}  radius       - Map radius in hexes
 * @param {Array<{q,r}>} targets - Spawn target coordinates (from spawnTarget())
 */
export function ensureSpawnClearance(tiles, radius, targets) {
  if (!targets || !targets.length) return;

  for (const target of targets) {
    for (let dq = -SPAWN_CLEARANCE_RING; dq <= SPAWN_CLEARANCE_RING; dq++) {
      for (let dr = -SPAWN_CLEARANCE_RING; dr <= SPAWN_CLEARANCE_RING; dr++) {
        const ds = -dq - dr;
        if (Math.abs(ds) > SPAWN_CLEARANCE_RING) continue;

        const q = target.q + dq;
        const r = target.r + dr;
        const key = coordKey({ q, r });
        const tile = tiles[key];
        if (!tile) continue;

        tile.terrain = demoteToPassable(tile.terrain);
        tile.feature = null;
        tile.debris = null;
      }
    }
  }
}
