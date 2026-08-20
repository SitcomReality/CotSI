/**
 * data/motifs/springPool.js — Shared motif: "springPool".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). The ghostly spring pool the Unfinished Lands
 * biome's water terrains wear. References by `{ motif: 'springPool', ... }`.
 */
export const SPRING_POOL_MOTIF = {
  id: 'springPool',
  parts: [
    {
      id: 'spring-pool',
      shape: 'spheroid',
      params: { radius: 0.09 },
      transform: { scaleY: 0.3 },
      color: 0x5ad0f0,
      biomeColor: { source: 'exotic', influence: 0.8 },
    },
  ],
};