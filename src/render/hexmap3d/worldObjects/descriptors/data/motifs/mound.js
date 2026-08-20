/**
 * data/motifs/mound.js — Shared motif: "mound".
 *
 * The hill-mound variant (sphere shape). Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'mound', weight, ... }`.
 */
export const MOUND_MOTIF = {
  id: 'mound',
  parts: [
    {
      id: 'mound',
      shape: 'sphere',
      params: { radius: 0.8, wSegs: 10, thetaLength: 1.4 },
      transform: {
        scaleY: 0.6666666666666667,
        localAngle: 1.5707963267948966,
        localAxis: { x: 0, y: 1, z: 0 },
      },
      color: 0xffffff,
      biomeColor: { source: 'terrain', influence: 0.8 },
      stretch: {
        y: { min: 1, max: 1.25, seed: 4 },
        x: { min: 0.9, max: 1.1, seed: 5 },
        z: { min: 0.9, max: 1.1, seed: 5 },
      },
    },
  ],
};
