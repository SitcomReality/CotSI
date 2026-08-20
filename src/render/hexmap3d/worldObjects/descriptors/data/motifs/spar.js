/**
 * data/motifs/spar.js — Shared motif: "spar".
 *
 * The plateau spar — two crystal/stone spars. Hand-authored
 * geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'spar', weight, ... }`.
 */
export const SPAR_MOTIF = {
  id: 'spar',
  parts: [
    {
      id: 'spar-a',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.015, height: 0.28, segments: 5 },
      transform: { localPos: { x: -0.08, y: 0, z: 0.04 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.75 },
      stretch: { y: { min: 0.8, max: 1.2, seed: 6 }, x: false, z: false },
      color: 0x9e8b72,
      biomeColor: { source: 'terrain', influence: 0.35 },
    },
    {
      id: 'spar-b',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.012, height: 0.2, segments: 5 },
      transform: { localPos: { x: 0.14, y: 0, z: -0.05 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
      color: 0x8f7b60,
    },
  ],
};
