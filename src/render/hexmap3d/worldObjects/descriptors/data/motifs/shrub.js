/**
 * data/motifs/shrub.js — Shared motif: "shrub".
 *
 * A low shrub (a small-medium plant, larger than a flower, smaller than a
 * tree). Extracted from the debris catch-all into its own motif file so it can
 * be authored with alternatives / per-biome distinctions as a proper plant
 * (Track 2). Hand-authored geometry source of truth — any decor's motif table
 * can reference it by `{ motif: 'shrub', weight, ... }`.
 */
export const SHRUB_MOTIF = {
  id: 'shrub',
  parts: [
    {
      id: 'shrub-a',
      shape: 'cone',
      params: { bottomR: 0.16, height: 0.18, heightSegs: 1 },
      transform: { scaleX: 1.5, scaleY: 0.7, scaleZ: 1.5 },
      color: 0x9a8845,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
  ],
};
