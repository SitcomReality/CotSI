/**
 * data/motifs/yetFragmentShard.js — Shared motif: "yetFragmentShard".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). The Unfinished Lands biome's
 * angular signature: an elongated crystal fragment floating above the ground.
 * One motif placement rolls a single shard, a pair, or a fanned burst.
 * References by `{ motif: 'yetFragmentShard', ... }`.
 */

// A single elongated, floating crystal shard (root leaf — lift keeps it airborne).
function shard(id, radius, scaleY, x, z, liftMin, liftMax, axis, angle) {
  return {
    id,
    shape: 'dodecahedron',
    params: { radius },
    transform: {
      y: 0,
      lift: 0,
      localPos: { x, y: 0, z },
      scaleY,
      liftRange: { min: liftMin, max: liftMax, seed: 10 },
      localAxis: axis,
      localAngle: angle,
    },
    color: 0xb8c4cc,
    biomeColor: { source: 'exotic', influence: 0.3 },
  };
}

export const YET_FRAGMENT_SHARD_MOTIF = {
  id: 'yetFragmentShard',
  parts: [
    {
      id: 'yet-fragment-shard-variant',
      seed: 108,
      default: 'yet-fragment-shard-single',
      alternatives: [
        {
          id: 'yet-fragment-shard-single',
          weight: 0.5,
          parts: [
            shard('yet-fragment-shard-single-a', 0.1, 1.6, 0, 0, 0.1, 0.38, { x: 1, y: 1, z: 0 }, 0.4),
          ],
        },
        {
          id: 'yet-fragment-shard-pair',
          weight: 0.3,
          parts: [
            shard('yet-fragment-shard-pair-a', 0.1, 1.6, -0.05, 0.02, 0.1, 0.36, { x: 1, y: 1, z: 0 }, 0.4),
            shard('yet-fragment-shard-pair-b', 0.07, 1.5, 0.1, -0.06, 0.22, 0.42, { x: 0, y: 1, z: 1 }, -0.6),
          ],
        },
        {
          id: 'yet-fragment-shard-burst',
          weight: 0.2,
          parts: [
            shard('yet-fragment-shard-burst-a', 0.09, 1.55, -0.07, 0.05, 0.12, 0.34, { x: 1, y: 0, z: 0 }, 0.3),
            shard('yet-fragment-shard-burst-b', 0.07, 1.6, 0.06, -0.04, 0.2, 0.4, { x: 0, y: 1, z: 1 }, -0.5),
            shard('yet-fragment-shard-burst-c', 0.05, 1.5, 0.12, 0.08, 0.3, 0.45, { x: 1, y: 1, z: 0 }, 0.7),
          ],
        },
      ],
    },
  ],
};
