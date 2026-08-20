/**
 * data/motifs/drywood.js — Shared motif: "drywood".
 *
 * The drywood tree from Deep Wood terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'drywood', weight, ... }`.
 */
export const DRYWOOD_MOTIF = {
  id: 'drywood',
  parts: [
    {
      id: 'drywood-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.085, topR: 0.055, height: 0.48 },
      stretch: { y: { min: 0.75, max: 1.2, seed: 6 } },
      color: 0x8f6b45,
      biomeColor: { source: 'terrain', influence: 0.4 },
    },
    {
      id: 'drywood-canopy',
      shape: 'cone',
      params: { bottomR: 0.22, height: 0.3, heightSegs: 1 },
      transform: {
        y: 0,
        lift: 0,
        liftRange: { min: 0.28, max: 0.4, seed: 6 },
      },
      color: 0x7d813f,
      biomeColor: { source: 'foliage', influence: 0.7 },
    },
  ],
};
