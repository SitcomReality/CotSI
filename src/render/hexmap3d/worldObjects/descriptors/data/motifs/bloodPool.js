/**
 * data/motifs/bloodPool.js — Shared motif: "bloodPool".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). The dark blood pool the Titanstain biome's
 * water terrains wear. References by `{ motif: 'bloodPool', ... }`.
 */
export const BLOOD_POOL_MOTIF = {
  id: 'bloodPool',
  parts: [
    {
      id: 'blood-pool',
      shape: 'spheroid',
      params: { radius: 0.1 },
      transform: { scaleY: 0.3 },
      color: 0x8a0f24,
      biomeColor: { source: 'exotic', influence: 0.8 },
    },
  ],
};