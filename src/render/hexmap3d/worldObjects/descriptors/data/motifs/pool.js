/**
 * data/motifs/pool.js — Shared motif: "pool".
 *
 * The unified supernatural surface motif, replacing bloodPool / ghostSpark /
 * springPool. One flat pool silhouette expressed as material alternatives
 * (blood pool in Titanstain, ghost spring/spark in the Unfinished Lands),
 * gated by per-option `biomeWeight`. Hand-authored geometry source of truth —
 * any decor's motif table can reference it by `{ motif: 'pool', weight, ... }`.
 */
export const POOL_MOTIF = {
  id: 'pool',
  parts: [
    {
      id: 'pool-variant',
      seed: 114,
      default: 'pool-blood',
      alternatives: [
        {
          id: 'pool-blood',
          weight: 1,
          biomeWeight: { biome_unfinished_lands: 0 },
          parts: [
            {
              id: 'pool-blood-a',
              shape: 'spheroid',
              params: { radius: 0.1 },
              transform: { scaleY: 0.3 },
              color: 0x8a0f24,
              biomeColor: { source: 'exotic', influence: 0.8 },
            },
          ],
        },
        {
          id: 'pool-spring',
          weight: 0.6,
          biomeWeight: { biome_titanstain: 0 },
          parts: [
            {
              id: 'pool-spring-a',
              shape: 'spheroid',
              params: { radius: 0.09 },
              transform: { scaleY: 0.3 },
              color: 0x5ad0f0,
              biomeColor: { source: 'exotic', influence: 0.8 },
            },
          ],
        },
        {
          id: 'pool-spark',
          weight: 0.4,
          biomeWeight: { biome_titanstain: 0 },
          parts: [
            {
              id: 'pool-spark-a',
              shape: 'sphere',
              params: { radius: 0.02 },
              transform: { localPos: { x: 0.05, y: 0.02, z: 0.03 } },
              color: 0xffffff,
              biomeColor: { source: 'foliage', influence: 0.4 },
            },
          ],
        },
      ],
    },
  ],
};
