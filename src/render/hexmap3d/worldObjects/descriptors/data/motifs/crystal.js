/**
 * data/motifs/crystal.js — Shared motif: "crystal".
 *
 * A faceted crystal formation: one motif placement rolls a single shard, a
 * pair, or a small outcrop cluster, so crystalline patches read as outcrops
 * rather than identical single shards. The formation weights are per-biome
 * biased — Edenfall and Dustbleed (the crystal's signature biomes) favor
 * outcrop clusters over lone shards. Hand-authored geometry source of truth —
 * any decor's motif table can reference it by `{ motif: 'crystal', weight, ... }`.
 */

// A single upright crystal shard, tilted slightly, bottom-anchored.
function crystal(id, radius, scaleY, x, z, angle) {
  return {
    id,
    shape: 'dodecahedron',
    params: { radius },
    transform: {
      localPos: { x, y: 0, z },
      scaleY,
      scaleX: 0.85,
      scaleZ: 0.85,
      localAxis: { x: 1, y: 1, z: 0 },
      localAngle: angle,
    },
    color: 0xb78be6,
    biomeColor: { source: 'exotic', influence: 0.7 },
    biomeScale: { biome_edenfall: 1.1 },
  };
}

export const CRYSTAL_MOTIF = {
  id: 'crystal',
  parts: [
    {
      id: 'crystal-formation',
      seed: 115,
      default: 'crystal-single',
      alternatives: [
        {
          id: 'crystal-single',
          weight: 0.4,
          // Rarer lone shard in the crystal-signature biomes — there it clusters.
          biomeWeight: { biome_edenfall: 0.7, biome_dustbleed: 0.7 },
          parts: [crystal('crystal-single-a', 0.11, 1.8, 0, 0, 0.3)],
        },
        {
          id: 'crystal-pair',
          weight: 0.35,
          parts: [
            crystal('crystal-pair-a', 0.1, 1.7, -0.06, 0.02, 0.3),
            crystal('crystal-pair-b', 0.07, 1.5, 0.09, -0.05, -0.5),
          ],
        },
        {
          id: 'crystal-outcrop',
          weight: 0.25,
          // Edenfall and Dustbleed host the richest crystal — they cluster.
          biomeWeight: { biome_edenfall: 1.4, biome_dustbleed: 1.4 },
          parts: [
            crystal('crystal-outcrop-a', 0.1, 1.7, -0.07, 0.05, 0.25),
            crystal('crystal-outcrop-b', 0.075, 1.55, 0.07, -0.03, -0.4),
            crystal('crystal-outcrop-c', 0.06, 1.4, 0.05, 0.1, 0.6),
          ],
        },
      ],
    },
  ],
};
