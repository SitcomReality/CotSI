/**
 * data/motifs/pile.js — Shared motif: "pile".
 *
 * The consolidated flattened-pile motif. One low pile silhouette expressed as
 * material alternatives (mud / wrack / crust / shell / pad / moundPlains),
 * gated by `weight` and per-option `biomeWeight` (the salt `crust` dominates
 * arid flats; `moundPlains`-snowy mounds favor the cold biomes). Hand-authored
 * geometry source of truth — any decor's motif table can reference it by
 * `{ motif: 'pile', weight, ... }`.
 */
export const PILE_MOTIF = {
  id: 'pile',
  parts: [
    {
      id: 'pile-variant',
      seed: 111,
      default: 'pile-mud',
      alternatives: [
        {
          id: 'pile-mud',
          weight: 0.3,
          parts: [
            {
              id: 'pile-mud-a',
              shape: 'spheroid',
              params: { radius: 0.13 },
              transform: { localPos: { x: -0.05, y: 0, z: 0.02 }, scaleY: 0.55, scaleX: 1.5, scaleZ: 1.5 },
              color: 0x5a4c3a,
              biomeColor: { source: 'terrain', influence: 0.5 },
            },
          ],
        },
        {
          id: 'pile-wrack',
          weight: 0.2,
          parts: [
            {
              id: 'pile-wrack-a',
              shape: 'spheroid',
              params: { radius: 0.12 },
              transform: { localPos: { x: 0.2, y: 0, z: 0.04 }, scaleY: 0.45, scaleX: 1.4, scaleZ: 1.4 },
              color: 0x3d594d,
              biomeColor: { source: 'wood', influence: 0.55 },
            },
          ],
        },
        {
          id: 'pile-crust',
          weight: 0.2,
          // Salt/dry crust — forms across the arid flats.
          biomeWeight: { biome_sere_wastes: 1.6, biome_dustbleed: 1.6, biome_scorch: 1.5 },
          parts: [
            {
              id: 'pile-crust-a',
              shape: 'spheroid',
              params: { radius: 0.13 },
              transform: { localPos: { x: 0.02, y: 0, z: -0.02 }, scaleY: 0.35, scaleX: 1.6, scaleZ: 1.6 },
              color: 0x8d7957,
              biomeColor: { source: 'terrain', influence: 0.55 },
            },
          ],
        },
        {
          id: 'pile-shell',
          weight: 0.15,
          parts: [
            {
              id: 'pile-shell-a',
              shape: 'spheroid',
              params: { radius: 0.08 },
              transform: { localPos: { x: -0.1, y: 0, z: -0.12 }, scaleY: 0.55, scaleX: 1.3, scaleZ: 1, localAngle: 0.5 },
              color: 0xe2d4c3,
              biomeColor: { source: 'exotic', influence: 0.5 },
            },
          ],
        },
        {
          id: 'pile-pad',
          weight: 0.1,
          parts: [
            {
              id: 'pile-pad-a',
              shape: 'cylinder',
              params: { bottomR: 0.13, topR: 0.13, height: 0.02, segments: 6 },
              transform: { localPos: { x: -0.03, y: 0.01, z: 0.12 } },
              color: 0x3e7c50,
              biomeColor: { source: 'foliage', influence: 0.6 },
            },
          ],
        },
        {
          id: 'pile-moundplains',
          weight: 0.05,
          biomeWeight: { biome_tundra: 2, biome_frigid_silence: 2 },
          parts: [
            {
              id: 'pile-moundplains-a',
              shape: 'spheroid',
              params: { radius: 0.12 },
              transform: { localPos: { x: 0.22, y: 0, z: 0.08 }, scaleY: 0.6, scaleX: 1.4, scaleZ: 1.4 },
              color: 0xd9e7ea,
              biomeColor: { source: 'exotic', influence: 0.6 },
              biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
            },
          ],
        },
      ],
    },
  ],
};
