/**
 * startingRegion.js — Eager starting-region chunk selection.
 *
 * The world is generated lazily chunk-by-chunk from the seed, but the region
 * around each faction's spawn is generated eagerly at creation so the global
 * post-passes (river tracing, connectivity, water rules) keep working as they
 * do on the classic full map — within the region. Everything beyond generates
 * on demand via state/chunkManager.js.
 *
 * Pure: chunk selection depends only on spawn targets, the map radius, and
 * the region radius parameter.
 */
import { hexesWithinRadius } from '../../../engine/rules/hexGrid.js';
import { tileToChunk, chunkKey } from '../../../engine/rules/chunkGrid.js';
import { STARTING_REGION_RADIUS } from '../../../params/game/worldParams.js';

/**
 * Chunk keys of every chunk containing at least one hex within `regionRadius`
 * of any spawn target (and within the map disc).
 *
 * @param {{q:number,r:number}[]} spawnTargets - Faction spawn hexes
 * @param {number} radius - Map radius in hexes
 * @param {number} [regionRadius=STARTING_REGION_RADIUS] - Region radius in hexes
 * @returns {Set<string>} chunk keys
 */
export function startingRegionChunkKeys(spawnTargets, radius, regionRadius = STARTING_REGION_RADIUS) {
  const set = new Set();
  const offsets = hexesWithinRadius(regionRadius);
  for (const t of spawnTargets) {
    if (!t) continue;
    for (const c of offsets) {
      const q = t.q + c.q;
      const r = t.r + c.r;
      const s = -q - r;
      // Skip hexes outside the map disc
      if (Math.abs(q) > radius || Math.abs(r) > radius || Math.abs(s) > radius) continue;
      const { cq, cr } = tileToChunk(q, r);
      set.add(chunkKey(cq, cr));
    }
  }
  return set;
}
