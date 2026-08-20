/**
 * data/motifs/yetFragmentPillar.js — Shared motif: "yetFragmentPillar".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the Unfinished
 * Lands biome. References by `{ motif: 'yetFragmentPillar', ... }`.
 */
export const YET_FRAGMENT_PILLAR_MOTIF = {
  id: 'yetFragmentPillar',
  parts: [
    {
      id: 'yet-fragment-pillar',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.05, height: 0.32 },
      transform: { localPos: { x: -0.16, y: 0, z: -0.05 }, liftRange: { min: 0.02, max: 0.22, seed: 4 } },
      stretch: {
        y: { min: 0.8, max: 1.5, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x9aa8b0,
      biomeColor: { source: 'terrain', influence: 0.35 },
    },
  ],
};