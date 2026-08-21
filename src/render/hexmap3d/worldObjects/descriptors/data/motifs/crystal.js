/**
 * data/motifs/crystal.js — Shared motif: "crystal".
 *
 * A single faceted crystal shard. Extracted from the debris catch-all into
 * its own motif file so it can be authored as a cluster/formation (Track 2).
 * Hand-authored geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'crystal', weight, ... }`.
 */
export const CRYSTAL_MOTIF = {
  id: 'crystal',
  parts: [
    {
      id: 'crystal-a',
      shape: 'dodecahedron',
      params: { radius: 0.12 },
      transform: { localPos: { x: -0.15, y: 0, z: 0 }, scaleY: 1.8, scaleX: 0.8, scaleZ: 0.8, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.3 },
      color: 0xb78be6,
      biomeColor: { source: 'exotic', influence: 0.7 },
      biomeScale: { biome_edenfall: 1.1 },
    },
  ],
};
