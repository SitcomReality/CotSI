/**
 * data/motifs/titanBoil.js — Shared motif: "titanBoil".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the
 * Titanstain biome. References by `{ motif: 'titanBoil', ... }`.
 */
export const TITAN_BOIL_MOTIF = {
  id: 'titanBoil',
  parts: [
    {
      id: 'titan-boil',
      shape: 'spheroid',
      params: { radius: 0.13 },
      transform: {
        localPos: { x: 0.05, y: 0, z: -0.12 },
        scaleY: 0.7,
        scaleX: 1.4,
        scaleZ: 1.4,
      },
      color: 0x9c4a5a,
      biomeColor: { source: 'foliage', influence: 0.6 },
    },
  ],
};