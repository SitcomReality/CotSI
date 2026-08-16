/**
 * decor/denseForest.js — Descriptor data for "Dense Forest decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DENSE_FOREST_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'denseForest',
  kind: 'decor',
  displayName: 'Dense Forest decor',
  cluster: { rule: 'moisture', countsByTerrain: { denseForest: [4, 7] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.35,
  motifs: [
    {
      id: 'tall',
      weight: 0.3,
      biomeWeight: {
        biome_tundra: 0.15,
        biome_frigid_silence: 0.15,
        biome_scorch: 0.3,
        biome_sere_wastes: 0.2,
        biome_mourning_marsh: 0.3,
      },
      parts: [
        {
          id: 'tall-trunk',
          shape: 'cylinder',
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          transform: { scaleY: 0.8 },
          biomeScale: { biome_tundra: 0.85 },
          color: 0x8b5e3c,
        },
        {
          id: 'tall-canopy',
          shape: 'cone',
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.162, max: 0.336, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.3, seed: 4 },
            x: { min: 0.9, max: 1.15, seed: 5 },
            z: { min: 0.9, max: 1.15, seed: 5 },
          },
          color: 0x2e8b57,
          biomeColor: { source: 'primary', influence: 0.7 },
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    {
      id: 'painforest',
      weight: 0.08,
      biomeWeight: { biome_painforest: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2 },
      parts: [
        {
          id: 'painforest-trunk-base',
          shape: 'cylinder',
          params: { bottomR: 0.13, topR: 0.08, height: 0.3, segments: 5 },
          transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.12 },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'painforest-trunk-upper',
          shape: 'cylinder',
          params: { topR: 0.05, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.3, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -0.15,
          },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'painforest-branch',
          shape: 'cylinder',
          params: { bottomR: 0.045, topR: 0.025, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.02, y: 0.52, z: 0.03 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.3490658503988659,
          },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
        {
          id: 'painforest-part-1',
          shape: 'cone',
          params: { bottomR: 0.2, height: 0.5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.7123075206439029, z: 0 },
          },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x10761e,
          biomeColor: { source: 'primary', influence: 0.97 },
        },
      ],
    },
    {
      id: 'taigawood',
      weight: 0.12,
      biomeWeight: { biome_tundra: 5, biome_scorch: 0.2, biome_sere_wastes: 0.2 },
      parts: [
        {
          id: 'taigawood-trunk',
          shape: 'cylinder',
          params: { topR: 0.06 },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x5c4b3e,
        },
        {
          id: 'taigawood-canopy',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.42 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.25, max: 0.4, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.25, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x4a7d5a,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'drywood',
      weight: 0.1,
      biomeWeight: {
        biome_scorch: 4,
        biome_tundra: 0.2,
        biome_frigid_silence: 0.2,
        biome_mourning_marsh: 0.3,
        biome_sere_wastes: 0.3,
      },
      parts: [
        {
          id: 'drywood-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.085, topR: 0.055, height: 0.48 },
          stretch: { y: { min: 0.75, max: 1.2, seed: 6 } },
          color: 0x8f6b45,
          biomeColor: { source: 'terrain', influence: 0.4 },
        },
        {
          id: 'drywood-canopy',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.3, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.28, max: 0.4, seed: 6 },
          },
          color: 0x7d813f,
          biomeColor: { source: 'primary', influence: 0.7 },
        },
      ],
    },
    {
      id: 'deadwood',
      weight: 0.1,
      biomeWeight: { biome_sere_wastes: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2, biome_edenfall: 0.3 },
      parts: [
        {
          id: 'deadwood-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.085, topR: 0.055, height: 0.52, segments: 5 },
          color: 0x655548,
          biomeColor: { source: 'terrain', influence: 0.35 },
        },
        {
          id: 'deadwood-branch-a',
          shape: 'cylinder',
          params: { bottomR: 0.035, topR: 0.018, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.04, y: 0.38, z: 0 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.85,
          },
          color: 0x59483d,
        },
        {
          id: 'deadwood-branch-b',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.015, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.04, y: 0.52, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -1.05,
          },
          color: 0x59483d,
        },
      ],
    },
    {
      id: 'violetwood',
      weight: 0.12,
      biomeWeight: { biome_edenfall: 3, biome_tundra: 0.2, biome_frigid_silence: 0.2 },
      parts: [
        {
          id: 'violetwood-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.075, topR: 0.05, height: 0.72 },
          color: 0x60434c,
        },
        {
          id: 'violetwood-crown',
          children: [
            {
              id: 'violetwood-cone',
              shape: 'cone',
              transform: { localPos: { x: 0, y: 0.36, z: 0 } },
              color: 0x8ff0a4,
              biomeColor: { source: 'primary', influence: 0.98 },
            },
            {
              id: 'violetwood-spire-choice-1',
              seed: 100,
              default: 'violetwood-spire-choice-1-option-1',
              alternatives: [
                {
                  id: 'violetwood-spire-choice-1-option-1',
                  weight: 0.05,
                  parts: [
                    {
                      id: 'violetwood-spire-config-1',
                      shape: 'octahedron',
                      transform: { localPos: { x: 0, y: 0.4, z: 0 } },
                      color: 0xffffff,
                      stretch: {
                        x: { min: 0.9, max: 1.1, seed: 6 },
                        z: { min: 0.9, max: 1.1, seed: 5 },
                        y: { min: 0.9, max: 1.1, seed: 4 },
                      },
                      biomeColor: { source: 'accent', influence: 0.8 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
