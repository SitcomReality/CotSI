/**
 * data/motifs/rock.js — Shared motif: "rock".
 *
 * A single dodecahedron rock used across desert and plateau
 * terrains. Hand-authored geometry source of truth — any
 * decor's motif table can reference it by
 * `{ motif: 'rock', weight, ... }`.
 */
export const ROCK_MOTIF = {
  id: 'rock',
  parts: [
    {
      id: 'rock-a',
      shape: 'dodecahedron',
      params: { radius: 0.13 },
      transform: { scaleX: 1.2, scaleY: 0.7, scaleZ: 1.1 },
      color: 0xc49a6c,
      biomeColor: { source: 'terrain', influence: 0.45 },
    },
  ],
};
