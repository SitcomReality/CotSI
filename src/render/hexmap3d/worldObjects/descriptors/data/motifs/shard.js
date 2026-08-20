/**
 * data/motifs/shard.js — Shared motif: "shard".
 *
 * A single dodecahedron shard used across plains and marsh
 * terrains. Hand-authored geometry source of truth — any
 * decor's motif table can reference it by
 * `{ motif: 'shard', weight, ... }`.
 */
export const SHARD_MOTIF = {
  id: 'shard',
  parts: [
    {
      id: 'shard-a',
      shape: 'dodecahedron',
      params: { radius: 0.06 },
      transform: { localPos: { x: 0.26, y: 0.02, z: 0.06 }, scaleY: 1.5 },
      color: 0x9ef0ea,
      biomeColor: { source: 'exotic', influence: 0.75 },
    },
  ],
};
