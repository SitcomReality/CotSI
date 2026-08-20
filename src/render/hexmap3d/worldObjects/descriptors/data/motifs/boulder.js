/**
 * data/motifs/boulder.js — Shared motif: "boulder".
 *
 * A single dodecahedron boulder used across plains and
 * plateau terrains. Hand-authored geometry source of truth —
 * any decor's motif table can reference it by
 * `{ motif: 'boulder', weight, ... }`.
 */
export const BOULDER_MOTIF = {
  id: 'boulder',
  parts: [
    {
      id: 'boulder-a',
      shape: 'dodecahedron',
      params: { radius: 0.11 },
      transform: { scaleY: 0.8, scaleX: 1.2, scaleZ: 1.1 },
      color: 0x8b7f6b,
      biomeColor: { source: 'terrain', influence: 0.35 },
    },
  ],
};
