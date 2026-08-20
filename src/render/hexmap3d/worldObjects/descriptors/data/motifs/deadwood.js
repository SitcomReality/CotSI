/**
 * data/motifs/deadwood.js — Shared motif: "deadwood".
 *
 * The deadwood tree from Deep Wood terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'deadwood', weight, ... }`.
 */
export const DEADWOOD_MOTIF = {
  id: 'deadwood',
  parts: [
    {
      id: 'deadwood-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.085, topR: 0.055, height: 0.52, segments: 5 },
      color: 0x655548,
      biomeColor: { source: 'terrain', influence: 0.35 },
    },
    {
      id: 'deadwood-branch-a',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.018, height: 0.3, segments: 5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.04, y: 0.38, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.85,
      },
      color: 0x59483d,
    },
    {
      id: 'deadwood-branch-b',
      shape: 'cylinder',
      params: { bottomR: 0.03, topR: 0.015, height: 0.24, segments: 5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.04, y: 0.52, z: 0.02 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -1.05,
      },
      color: 0x59483d,
    },
  ],
};
