/**
 * data/motifs/bone.js — Shared motif: "bone".
 *
 * The beach bone variant (single rib). Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'bone', weight, ... }`.
 */
export const BONE_MOTIF = {
  id: 'bone',
  parts: [
    {
      id: 'bone-rib',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.015, height: 0.26, segments: 5 },
      transform: { localPos: { x: -0.08, y: 0, z: 0.12 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.85 },
      color: 0xefe7d2,
      biomeColor: { source: 'terrain', influence: 0.6 },
    },
  ],
};
