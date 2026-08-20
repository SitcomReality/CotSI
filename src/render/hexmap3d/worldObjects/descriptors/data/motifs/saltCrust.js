/**
 * data/motifs/saltCrust.js — Shared motif: "saltCrust".
 *
 * The salt crust (mourning marsh variant) — a salt mound
 * with a crust chunk and a stalk. Hand-authored geometry
 * source of truth — any decor's motif table can reference
 * it by `{ motif: 'saltCrust', weight, ... }`.
 */
export const SALT_CRUST_MOTIF = {
  id: 'saltCrust',
  parts: [
    {
      id: 'salt-mound',
      shape: 'spheroid',
      params: { radius: 0.14 },
      transform: { scaleX: 1.6, scaleY: 0.4, scaleZ: 1.6 },
      color: 0x8e9490,
      biomeColor: { source: 'terrain', influence: 0.55 },
    },
    {
      id: 'salt-crust-a',
      shape: 'cube',
      params: { size: 0.07 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.2, y: 0, z: -0.02 },
      },
      color: 0xa5aeab,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
    {
      id: 'salt-stalk',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.032, height: 0.32, segments: 5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.14, y: 0, z: -0.06 },
      },
      stretch: {
        y: { min: 0.85, max: 1.15, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x6f7c76,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
  ],
};
