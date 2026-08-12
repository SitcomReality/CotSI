/**
 * clusterCount.js — Deterministic item count for a tile-driven descriptor.
 *
 * How many items share a hex, from the descriptor's `cluster` rule and the
 * tile hash (see itemSelection in recordBuilder.js). Pure — no THREE.
 */
import { lerp, clamp01 } from '../tileHash.js';

/**
 * Deterministic item count.
 *   uniform  — roll in [cluster.min, cluster.max] from the tile hash.
 *              Tile hashes can be negative (hex coords), so the roll is
 *              normalized to a non-negative index.
 *   moisture — the legacy cluster-grove rule: count scales with the tile's
 *              moisture between `countsByTerrain[terrain]` min/max, plus a
 *              per-tile hash jitter of ±`jitter`. Replicates the game's
 *              clusterCount() verbatim, including the JS `%` sign quirk on
 *              negative tile hashes, so migrated groves match the old render.
 */
export function itemCount(descriptor, tile, tileH) {
  const cluster = descriptor.cluster;
  if (cluster.rule === 'moisture') {
    const m = tile.moisture;
    const [a, b] = cluster.densityRange;
    const density = Number.isFinite(m) ? clamp01((m - a) / (b - a)) : 0.5;
    const [min, max] = cluster.countsByTerrain[tile.terrain] ?? cluster.countsByTerrain.forest;
    const count = Math.round(lerp(min, max, density));
    return Math.min(max, Math.max(min, count + (tileH % (cluster.jitter * 2 + 1)) - cluster.jitter));
  }
  const { min, max } = cluster;
  const span = Math.max(1, max - min + 1);
  const roll = ((tileH % span) + span) % span;
  return min + roll;
}
