import { coordKey } from '../../../../engine/rules/hexGrid.js';

/**
 * rivers/riverTerrain.js — Turn traced river paths into real river terrain.
 *
 * Rivers are first-class terrain: every tile a traced path crosses becomes
 * `terrain: 'river'`, replacing whatever was classified there (plains, forest,
 * marsh, hill, mountain, peak, floatingIsland — a river through a mountain is
 * a canyon). The one exception is the water mouth tile the river empties
 * into: it stays `water` so it remains part of its lake/ocean body.
 *
 * Features are cleared from path tiles — nothing spawns in the water. The
 * channel's final elevation is not set here; carveRiverBeds() owns that.
 *
 * Deterministic and idempotent for identical paths. Pure data transform.
 *
 * @param {object}      tiles      - Flat tile map keyed by "q,r"
 * @param {Array<{q,r}[]>} riverPaths - Ordered river paths from traceRiver
 */
export function applyRiverTerrain(tiles, riverPaths) {
  for (const path of riverPaths) {
    for (const hex of path) {
      const tile = tiles[coordKey(hex)];
      if (!tile) continue;
      if (tile.terrain === 'water') continue; // mouth — part of the body
      tile.terrain = 'river';
      tile.feature = null;
    }
  }
}
