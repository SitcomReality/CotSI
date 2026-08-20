/**
 * data/motifs/yetFragmentCone.js — Shared motif: "yetFragmentCone".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the Unfinished
 * Lands biome. References by `{ motif: 'yetFragmentCone', ... }`.
 */
export const YET_FRAGMENT_CONE_MOTIF = {
  id: 'yetFragmentCone',
  parts: [
    {
      id: 'yet-fragment-cone',
      shape: 'cone',
      params: { bottomR: 0.11, height: 0.2, heightSegs: 1 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 0.9,
        localPos: { x: -0.27, y: 0, z: 0.1 },
        liftRange: { min: 0, max: 0.12, seed: 12 },
      },
      color: 0x7d8b93,
      biomeColor: { source: 'terrain', influence: 0.45 },
    },
  ],
};