/**
 * data/motifs/titanTendril.js — Shared motif: "titanTendril".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the
 * Titanstain biome. References by `{ motif: 'titanTendril', ... }`.
 */
export const TITAN_TENDRIL_MOTIF = {
  id: 'titanTendril',
  parts: [
    {
      id: 'titan-tendril',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.042, height: 0.2, segments: 5 },
      transform: {
        localPos: { x: 0.26, y: 0, z: -0.08 },
        tiltAxis: { x: 1, z: 0 },
        tilt: 0.6,
      },
      stretch: { y: { min: 0.7, max: 1.3, seed: 10 }, x: false, z: false },
      color: 0x582535,
      biomeColor: { source: 'foliage', influence: 0.55 },
    },
  ],
};