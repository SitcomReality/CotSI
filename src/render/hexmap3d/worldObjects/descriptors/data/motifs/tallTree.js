/**
 * data/motifs/tallTree.js — Shared motif: "tallTree".
 *
 * The tall tree from Deep Wood terrain. Hand-authored geometry source
 * of truth — any decor's motif table can reference it by
 * `{ motif: 'tallTree', weight, ... }`.
 */
export const TALL_TREE_MOTIF = {
  id: 'tallTree',
  parts: [
    {
      id: 'tallTree-trunk',
      shape: 'cylinder',
      stretch: {
        y: { min: 0.9, max: 1.2, seed: 6 },
        x: false,
        z: false,
      },
      transform: { scaleY: 0.8 },
      biomeScale: { biome_tundra: 0.85 },
      color: 0x8b5e3c,
    },
    {
      id: 'tallTree-canopy',
      shape: 'cone',
      transform: {
        y: 0,
        lift: 0,
        liftRange: { min: 0.162, max: 0.336, seed: 6 },
      },
      stretch: {
        y: { min: 0.85, max: 1.3, seed: 4 },
        x: { min: 0.9, max: 1.15, seed: 5 },
        z: { min: 0.9, max: 1.15, seed: 5 },
      },
      color: 0x2e8b57,
      biomeColor: { source: 'foliage', influence: 0.7 },
      biomeScale: { biome_tundra: 0.85 },
    },
  ],
};
