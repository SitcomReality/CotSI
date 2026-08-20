/**
 * data/motifs/cattail.js — Shared motif: "cattail".
 *
 * The marsh cattail — a stalk with a head. Hand-authored
 * geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'cattail', weight, ... }`.
 */
export const CATTAIL_MOTIF = {
  id: 'cattail',
  parts: [
    {
      id: 'cattail-stalk',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.032, height: 0.45, segments: 6 },
      transform: { localPos: { x: -0.14, y: 0, z: -0.06 } },
      stretch: { y: { min: 0.9, max: 1.25, seed: 6 }, x: false, z: false },
      color: 0x5b7138,
      biomeColor: { source: 'foliage', influence: 0.35 },
    },
    {
      id: 'cattail-head',
      shape: 'cylinder',
      params: { bottomR: 0.045, topR: 0.04, height: 0.11, segments: 6 },
      transform: { liftRange: { min: 0.36, max: 0.52, seed: 6 }, localPos: { x: -0.14, y: 0, z: -0.06 } },
      stretch: { x: false, y: false, z: false },
      color: 0x8c5a3a,
    },
  ],
};
