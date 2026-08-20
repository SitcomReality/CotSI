/**
 * data/motifs/violetwood.js — Shared motif: "violetwood".
 *
 * The violetwood tree from Deep Wood terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'violetwood', weight, ... }`.
 */
export const VIOLETWOOD_MOTIF = {
  id: 'violetwood',
  parts: [
    {
      id: 'violetwood-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.075, topR: 0.05, height: 0.72 },
      color: 0x60434c,
    },
    {
      id: 'violetwood-crown',
      children: [
        {
          id: 'violetwood-cone',
          shape: 'cone',
          transform: { localPos: { x: 0, y: 0.36, z: 0 } },
          color: 0x8ff0a4,
          biomeColor: { source: 'foliage', influence: 0.98 },
        },
      ],
    },
  ],
};
