/**
 * data/motifs/tuft.js — Shared motif: "tuft".
 *
 * A small cone-shaped grass tuft used across plains, beach,
 * and plateau terrains. Hand-authored geometry source of
 * truth — any decor's motif table can reference it by
 * `{ motif: 'tuft', weight, ... }`.
 */
export const TUFT_MOTIF = {
  id: 'tuft',
  parts: [
    {
      id: 'tuft-a',
      shape: 'cone',
      params: { bottomR: 0.22, height: 0.22, radialSegs: 6, heightSegs: 1 },
      transform: { scaleY: 0.8, scaleX: 1.5, scaleZ: 1.5 },
      color: 0x6e9c46,
      biomeColor: { source: 'foliage', influence: 0.55 },
    },
  ],
};
