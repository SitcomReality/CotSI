/**
 * data/motifs/yetFragmentOrb.js — Shared motif: "yetFragmentOrb".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). A discrete signature object of the Unfinished
 * Lands biome. References by `{ motif: 'yetFragmentOrb', ... }`.
 */
export const YET_FRAGMENT_ORB_MOTIF = {
  id: 'yetFragmentOrb',
  parts: [
    {
      id: 'yet-fragment-orb',
      shape: 'spheroid',
      params: { radius: 0.06 },
      transform: {
        y: 0,
        lift: 0,
        scaleX: 1.3,
        scaleY: 0.7,
        scaleZ: 1.3,
        localPos: { x: 0.08, y: 0, z: -0.18 },
        liftRange: { min: 0.16, max: 0.4, seed: 14 },
      },
      color: 0xd0d8de,
      biomeColor: { source: 'exotic', influence: 0.3 },
    },
  ],
};