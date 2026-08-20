/**
 * data/motifs/reed.js — Shared motif: "reed".
 *
 * The plateau reed — two reed stalks. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'reed', weight, ... }`.
 */
export const REED_MOTIF = {
  id: 'reed',
  parts: [
    {
      id: 'reed-a',
      shape: 'cylinder',
      params: { bottomR: 0.03, topR: 0.02, height: 0.34, segments: 5 },
      transform: { localPos: { x: 0.12, y: 0, z: -0.02 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.7 },
      color: 0x4a5d3e,
    },
    {
      id: 'reed-b',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.018, height: 0.26, segments: 5 },
      transform: { localPos: { x: -0.08, y: 0, z: 0.1 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.8 },
      color: 0x5c704e,
    },
  ],
};
