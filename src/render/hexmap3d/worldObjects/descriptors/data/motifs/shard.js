/**
 * data/motifs/shard.js — Shared motif: "shard".
 *
 * The consolidated faceted-shard motif. One tall faceted silhouette expressed
 * as material alternatives (shard / glass), gated by `weight`. Hand-authored
 * geometry source of truth — any decor's motif table can reference it by
 * `{ motif: 'shard', weight, ... }`.
 */
export const SHARD_MOTIF = {
  id: 'shard',
  parts: [
    {
      id: 'shard-variant',
      seed: 112,
      default: 'shard-facet',
      alternatives: [
        {
          id: 'shard-facet',
          weight: 0.7,
          parts: [
            {
              id: 'shard-facet-a',
              shape: 'dodecahedron',
              params: { radius: 0.06 },
              transform: { localPos: { x: 0.26, y: 0.02, z: 0.06 }, scaleY: 1.5 },
              color: 0x9ef0ea,
              biomeColor: { source: 'exotic', influence: 0.75 },
            },
          ],
        },
        {
          id: 'shard-glass',
          weight: 0.3,
          parts: [
            {
              id: 'shard-glass-a',
              shape: 'dodecahedron',
              params: { radius: 0.07 },
              transform: { scaleY: 1.4, scaleX: 0.7, scaleZ: 0.7, localAngle: 0.5 },
              color: 0xc994ee,
              biomeColor: { source: 'exotic', influence: 0.7 },
            },
          ],
        },
      ],
    },
  ],
};
