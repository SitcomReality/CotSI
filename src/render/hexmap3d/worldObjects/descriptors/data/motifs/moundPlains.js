/**
 * data/motifs/moundPlains.js — Shared motif: "moundPlains".
 *
 * The plains-mound variant (spheroid shape). Hand-authored
 * geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'moundPlains', weight, ... }`.
 */
export const MOUND_PLAINS_MOTIF = {
  id: 'moundPlains',
  parts: [
    {
      id: 'moundPlains-a',
      shape: 'spheroid',
      params: { radius: 0.12 },
      transform: { localPos: { x: 0.22, y: 0, z: 0.08 }, scaleY: 0.6, scaleX: 1.4, scaleZ: 1.4 },
      color: 0xd9e7ea,
      biomeColor: { source: 'exotic', influence: 0.6 },
      biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
    },
  ],
};
