/**
 * data/motifs/titanTooth.js — Shared motif: "titanTooth".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the
 * Titanstain biome. References by `{ motif: 'titanTooth', ... }`.
 */
export const TITAN_TOOTH_MOTIF = {
  id: 'titanTooth',
  parts: [
    {
      id: 'titan-tooth',
      shape: 'cylinder',
      params: { bottomR: 0.028, topR: 0.012, height: 0.24, segments: 5 },
      transform: {
        localPos: { x: 0.18, y: 0, z: 0.07 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: -0.7,
      },
      stretch: { y: { min: 0.8, max: 1.25, seed: 8 }, x: false, z: false },
      color: 0xd8d0c0,
      biomeColor: { source: 'terrain', influence: 0.3 },
    },
  ],
};