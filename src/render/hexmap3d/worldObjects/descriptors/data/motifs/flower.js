/**
 * data/motifs/flower.js — Shared motif: "flower".
 *
 * A small bloom (a single elevated spheroid). Extracted from the debris
 * catch-all into its own motif file so it can be authored as a proper bloom
 * (Track 2) — a stalk with a sphere on top. Hand-authored geometry source of
 * truth — any decor's motif table can reference it by
 * `{ motif: 'flower', weight, ... }`.
 */
export const FLOWER_MOTIF = {
  id: 'flower',
  parts: [
    {
      id: 'flower-a',
      shape: 'spheroid',
      params: { radius: 0.06 },
      transform: { localPos: { x: -0.22, y: 0.06, z: -0.08 }, scaleY: 0.7 },
      color: 0xd9a43b,
      biomeColor: { source: 'bloom', influence: 0.5 },
    },
  ],
};
