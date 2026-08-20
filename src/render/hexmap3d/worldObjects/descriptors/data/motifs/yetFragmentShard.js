/**
 * data/motifs/yetFragmentShard.js — Shared motif: "yetFragmentShard".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the Unfinished
 * Lands biome. References by `{ motif: 'yetFragmentShard', ... }`.
 */
export const YET_FRAGMENT_SHARD_MOTIF = {
  id: 'yetFragmentShard',
  parts: [
    {
      id: 'yet-fragment-shard',
      shape: 'dodecahedron',
      params: { radius: 0.1 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 1.6,
        localPos: { x: -0.02, y: 0, z: 0.12 },
        liftRange: { min: 0.1, max: 0.38, seed: 10 },
      },
      color: 0xb8c4cc,
      biomeColor: { source: 'exotic', influence: 0.3 },
    },
  ],
};