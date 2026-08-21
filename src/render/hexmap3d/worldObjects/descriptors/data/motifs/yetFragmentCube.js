/**
 * data/motifs/yetFragmentCube.js — Shared motif: "yetFragmentCube".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). A discrete signature object of the Unfinished
 * Lands biome. References by `{ motif: 'yetFragmentCube', ... }`.
 */
export const YET_FRAGMENT_CUBE_MOTIF = {
  id: 'yetFragmentCube',
  parts: [
    {
      id: 'yet-fragment-cube',
      shape: 'cube',
      params: { size: 0.13 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.2, y: 0, z: 0.04 },
        liftRange: { min: 0.06, max: 0.28, seed: 8 },
        localAxis: { x: 1, y: 1, z: 0 },
        localAngle: 0.6,
      },
      color: 0x8a9aa2,
      biomeColor: { source: 'terrain', influence: 0.4 },
    },
  ],
};