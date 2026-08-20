/**
 * data/motifs/boneStalk.js — Shared motif: "boneStalk".
 *
 * The marsh bone variant (two stalks). Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'boneStalk', weight, ... }`.
 */
export const BONE_STALK_MOTIF = {
  id: 'boneStalk',
  parts: [
    {
      id: 'bone-stalk-a',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.018, height: 0.36, segments: 5 },
      transform: { localPos: { x: -0.12, y: 0, z: -0.03 } },
      stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
      color: 0xd0c3a6,
      biomeColor: { source: 'terrain', influence: 0.55 },
    },
    {
      id: 'bone-stalk-b',
      shape: 'cylinder',
      params: { bottomR: 0.022, topR: 0.016, height: 0.28, segments: 5 },
      transform: { localPos: { x: 0.14, y: 0, z: 0.04 } },
      stretch: { y: { min: 0.9, max: 1.2, seed: 8 }, x: false, z: false },
      color: 0xc4b896,
      biomeColor: { source: 'terrain', influence: 0.55 },
    },
  ],
};
