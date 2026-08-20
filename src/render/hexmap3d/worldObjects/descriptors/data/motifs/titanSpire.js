/**
 * data/motifs/titanSpire.js — Shared motif: "titanSpire".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). The Titanstain biome's grow outfit works as
 * a discrete signature object. A decor's motif table references it by id
 * (`{ motif: 'titanSpire', weight, biomeWeight, ... }`); per-use presentation —
 * size/placement/weight — lives on the referencing decor.
 */
export const TITAN_SPIRE_MOTIF = {
  id: 'titanSpire',
  parts: [
    {
      id: 'titan-spire',
      shape: 'cone',
      params: { bottomR: 0.09, height: 0.38, radialSegs: 6, heightSegs: 2 },
      transform: { localPos: { x: -0.12, y: 0, z: -0.03 } },
      stretch: { y: { min: 0.85, max: 1.35, seed: 6 }, x: false, z: false },
      color: 0x7c3b48,
      biomeColor: { source: 'foliage', influence: 0.55 },
    },
  ],
};