/**
 * data/motifs/deadCactus.js — Shared motif: "deadCactus".
 *
 * The dead cactus — two ribs and a chip. Hand-authored
 * geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'deadCactus', weight, ... }`.
 */
export const DEAD_CACTUS_MOTIF = {
  id: 'deadCactus',
  parts: [
    {
      id: 'dead-rib',
      shape: 'cylinder',
      params: { bottomR: 0.045, topR: 0.02, segments: 5 },
      transform: {
        localPos: { x: -0.18, y: 0, z: 0.03 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: -1.1,
      },
      color: 0xe2d7bd,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
    {
      id: 'dead-chip',
      shape: 'cube',
      params: { size: 0.05 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.06, y: 0, z: 0.13 },
      },
      color: 0xe6dcc3,
    },
  ],
};
