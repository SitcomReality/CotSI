/**
 * data/motifs/roundTree.js — Shared motif: "roundTree".
 *
 * The round tree from Forest terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'roundTree', weight, ... }`.
 */
export const ROUND_TREE_MOTIF = {
  id: 'roundTree',
  parts: [
    {
      id: 'roundTree-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.1, topR: 0.075 },
      stretch: {
        y: { min: 1, max: 1.2, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x8b5e3c,
      biomeColor: { source: 'wood', influence: 0.4 },
      biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
    },
    {
      id: 'roundTree-flare',
      shape: 'cylinder',
      params: { bottomR: 0.14, topR: 0.105, height: 0.1 },
      stretch: {
        y: { min: 0.9, max: 1.1, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x8b5e3c,
      biomeColor: { source: 'wood', influence: 0.4 },
      biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
      transform: { y: 0, lift: 0 },
    },
    {
      id: 'roundTree-canopy',
      shape: 'sphere',
      transform: {
        y: 0.15,
        lift: 0,
        liftRange: { min: 0.15, max: 0.3, seed: 6 },
      },
      stretch: {
        y: { min: 0.85, max: 1.3, seed: 4 },
        x: { min: 0.9, max: 1.15, seed: 5 },
        z: { min: 0.9, max: 1.15, seed: 5 },
      },
      color: 0x166d24,
      biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
      biomeColor: { source: 'foliage', influence: 0.7 },
    },
    {
      id: 'roundTree-canopy-b',
      shape: 'sphere',
      transform: {
        y: 0.15,
        lift: 0,
        liftRange: { min: 0.15, max: 0.3, seed: 6 },
        localPos: { x: -0.16, y: 0.22, z: 0.12 },
      },
      stretch: {
        y: { min: 0.85, max: 1.25, seed: 4 },
        x: { min: 0.9, max: 1.15, seed: 5 },
        z: { min: 0.9, max: 1.15, seed: 5 },
      },
      color: 0x1f7a28,
      biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
      biomeColor: { source: 'foliage', influence: 0.7 },
      params: { radius: 0.21 },
    },
    {
      id: 'roundTree-fruit',
      seed: 103,
      default: 'roundTree-berries',
      alternatives: [
        { id: 'roundTree-fruit-none', weight: 0.45, parts: [] },
        {
          id: 'roundTree-berries',
          weight: 0.35,
          parts: [
            {
              id: 'roundTree-berry-a',
              shape: 'dodecahedron',
              params: { radius: 0.035 },
              color: 0xb5484d,
              biomeColor: { source: 'bloom', influence: 0.85 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: 0.2, y: 0.05, z: -0.14 },
              },
            },
            {
              id: 'roundTree-berry-b',
              shape: 'dodecahedron',
              params: { radius: 0.035 },
              color: 0xb5484d,
              biomeColor: { source: 'bloom', influence: 0.85 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: -0.17, y: 0.12, z: 0.1 },
              },
            },
            {
              id: 'roundTree-berry-c',
              shape: 'dodecahedron',
              params: { radius: 0.035 },
              color: 0xb5484d,
              biomeColor: { source: 'bloom', influence: 0.85 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: 0.02, y: 0.18, z: 0.18 },
              },
            },
          ],
        },
        {
          id: 'roundTree-blossom',
          weight: 0.2,
          parts: [
            {
              id: 'roundTree-blossom-a',
              shape: 'sphere',
              params: { radius: 0.032 },
              color: 0xf2e3b0,
              biomeColor: { source: 'bloom', influence: 0.9 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: 0.16, y: 0.02, z: 0.15 },
              },
            },
            {
              id: 'roundTree-blossom-b',
              shape: 'sphere',
              params: { radius: 0.032 },
              color: 0xf2e3b0,
              biomeColor: { source: 'bloom', influence: 0.9 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: -0.19, y: 0.1, z: -0.07 },
              },
            },
            {
              id: 'roundTree-blossom-c',
              shape: 'sphere',
              params: { radius: 0.032 },
              color: 0xf2e3b0,
              biomeColor: { source: 'bloom', influence: 0.9 },
              biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
              transform: {
                y: 0.15,
                lift: 0,
                liftRange: { min: 0.15, max: 0.3, seed: 6 },
                localPos: { x: -0.05, y: 0.2, z: 0.16 },
              },
            },
          ],
        },
      ],
    },
  ],
};
