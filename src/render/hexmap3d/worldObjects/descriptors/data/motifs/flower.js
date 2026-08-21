/**
 * data/motifs/flower.js — Shared motif: "flower".
 *
 * A proper bloom: a thin green stalk topped with a wide, flat head that tints
 * toward the biome's `bloom` swatch. Reads like a cattail but with a broader,
 * flatter head. Hand-authored geometry source of truth — any decor's motif
 * table can reference it by `{ motif: 'flower', weight, ... }`.
 */
export const FLOWER_MOTIF = {
  id: 'flower',
  parts: [
    {
      id: 'flower-plant',
      children: [
        {
          id: 'flower-stalk',
          shape: 'cylinder',
          params: { bottomR: 0.018, topR: 0.012, height: 0.18, segments: 5 },
          transform: { localPos: { x: 0, y: 0.09, z: 0 } },
          color: 0x6f8f4a,
          biomeColor: { source: 'foliage', influence: 0.4 },
        },
        {
          id: 'flower-bloom',
          shape: 'spheroid',
          params: { radius: 0.05 },
          transform: {
            localPos: { x: 0, y: 0.18, z: 0 },
            scaleX: 1.6,
            scaleZ: 1.6,
            scaleY: 0.55,
          },
          color: 0xd96a7a,
          biomeColor: { source: 'bloom', influence: 0.75 },
        },
      ],
    },
  ],
};
