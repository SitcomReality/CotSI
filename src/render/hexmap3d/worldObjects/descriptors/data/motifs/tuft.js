/**
 * data/motifs/tuft.js — Shared motif: "tuft".
 *
 * The consolidated grass-tuft motif. One low cone silhouette expressed as
 * material alternatives (tuft / tussock), gated by `weight` and a per-option
 * `biomeWeight` — the lush grass clump dominates the wet, mild biomes while the
 * drier, sparser tussock dominates arid scrub. Hand-authored geometry source of
 * truth — any decor's motif table can reference it by
 * `{ motif: 'tuft', weight, ... }`.
 */
export const TUFT_MOTIF = {
  id: 'tuft',
  parts: [
    {
      id: 'tuft-variant',
      seed: 113,
      default: 'tuft-grass',
      alternatives: [
        {
          id: 'tuft-grass',
          weight: 0.55,
          // Lush, full clump — favors the wet, mild biomes.
          biomeWeight: {
            biome_edenfall: 1.4, biome_painforest: 1.4, biome_mourning_marsh: 1.3,
            biome_default: 1.2, biome_tundra: 1.2,
            biome_sere_wastes: 0.5, biome_scorch: 0.6, biome_dustbleed: 0.6,
            biome_frigid_silence: 0.75,
          },
          parts: [
            {
              id: 'tuft-grass-a',
              shape: 'cone',
              params: { bottomR: 0.22, height: 0.22, radialSegs: 6, heightSegs: 1 },
              transform: { scaleY: 0.8, scaleX: 1.5, scaleZ: 1.5 },
              color: 0x6e9c46,
              biomeColor: { source: 'foliage', influence: 0.55 },
            },
          ],
        },
        {
          id: 'tuft-tussock',
          weight: 0.45,
          // Drier, sparser clump — arid / dry-scrub biomes.
          biomeWeight: {
            biome_sere_wastes: 1.8, biome_dustbleed: 1.6, biome_scorch: 1.5,
            biome_frigid_silence: 1.2,
            biome_edenfall: 0.7, biome_painforest: 0.7,
          },
          parts: [
            {
              id: 'tuft-tussock-a',
              shape: 'cone',
              params: { bottomR: 0.2, height: 0.24, radialSegs: 6, heightSegs: 1 },
              transform: { localPos: { x: 0.03, y: 0, z: -0.04 }, scaleY: 0.8, scaleX: 1.4, scaleZ: 1.4 },
              color: 0x4b7040,
              biomeColor: { source: 'foliage', influence: 0.55 },
            },
          ],
        },
      ],
    },
  ],
};
