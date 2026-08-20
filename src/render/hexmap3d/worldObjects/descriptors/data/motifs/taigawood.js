/**
 * data/motifs/taigawood.js — Shared motif: "taigawood".
 *
 * The taigawood tree from Deep Wood terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'taigawood', weight, ... }`.
 */
export const TAIGAWOOD_MOTIF = {
  id: 'taigawood',
  parts: [
    {
      id: 'taigawood-trunk',
      shape: 'cylinder',
      params: { topR: 0.06 },
      stretch: {
        y: { min: 0.85, max: 1.15, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x5c4b3e,
    },
    {
      id: 'taigawood-canopy',
      shape: 'cone',
      params: { bottomR: 0.22, height: 0.42 },
      transform: {
        y: 0,
        lift: 0,
        liftRange: { min: 0.25, max: 0.4, seed: 6 },
      },
      stretch: {
        y: { min: 0.85, max: 1.25, seed: 4 },
        x: { min: 0.85, max: 1.1, seed: 5 },
        z: { min: 0.85, max: 1.1, seed: 5 },
      },
      color: 0x4a7d5a,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
  ],
};
