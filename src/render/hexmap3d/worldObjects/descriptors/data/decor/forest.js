/**
 * decor/forest.js — Descriptor data for "Forest decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const FOREST_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'forest',
  kind: 'decor',
  displayName: 'Forest decor',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.35,
  motifs: [
    {
      id: 'round',
      weight: 0.3,
      biomeWeight: {
        biome_tundra: 0.15,
        biome_frigid_silence: 0.15,
        biome_scorch: 0.3,
        biome_sere_wastes: 0.1,
        biome_mourning_marsh: 0.3,
      },
      parts: [
        {
          id: 'round-trunk',
          shape: 'cylinder',
          stretch: {
            y: { min: 1, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_tundra: 0.85, biome_scorch: 0.6 },
          color: 0x8b5e3c,
          biomeColor: { source: 'wood', influence: 0.4 },
        },
        {
          id: 'round-canopy',
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
      ],
    },
    {
      id: 'painforest',
      weight: 0.08,
      biomeWeight: {
        biome_painforest: 5,
        biome_tundra: 0.2,
        biome_frigid_silence: 0.2,
        biome_dustbleed: 0,
        biome_default: 0.2,
        biome_titanstain: 0.2,
        biome_edenfall: 0.2,
        biome_mourning_marsh: 0.2,
        biome_scorch: 0.3,
        biome_sere_wastes: 0.05,
        biome_unfinished_lands: 0.2,
      },
      parts: [
        // The gnarled trunk — the tree's ROOT leaves (both at the same origin),
        // always present. The branch apparatus below lives in a grouped choice
        // so each tree keeps a single root origin for tile item-counting while
        // still resolving one branch style.
        {
          id: 'painforest-trunk-base',
          shape: 'cylinder',
          params: { bottomR: 0.13, topR: 0.08, height: 0.3, segments: 5 },
          transform: {
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.12,
            localPos: { x: 0, y: 0, z: 0 },
          },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
          biomeColor: { source: 'wood', influence: 0.6 },
        },
        {
          id: 'painforest-trunk-upper',
          shape: 'cylinder',
          params: { topR: 0.05, height: 0.24, segments: 5 },
          transform: {
            localPos: { x: 0, y: 0.3, z: 0 },
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
          biomeColor: { source: 'wood', influence: 0.6 },
        },
        // Branch-style choice — each tree rolls ONE gnarled branch configuration
        // (a GROUP of branch + canopy leaves). This is the basic alternatives
        // pattern: weighted, seeded, with a non-empty default. Every option's
        // branch/canopy leaves are named with the `-branch` / `-canopy` suffix
        // so the render tests match by structure regardless of which config rools.
        {
          id: 'painforest-branch-split',
          seed: 102,
          default: 'painforest-style-spread',
          alternatives: [
            {
              id: 'painforest-style-spread',
              weight: 0.45,
              parts: [
                {
                  id: 'painforest-branch-spread',
                  transform: {
                    localPos: { x: 0.02, y: 0.52, z: 0.03 },
                    localAxis: { x: 1, y: 0, z: 0 },
                    localAngle: 0,
                  },
                  children: [
                    {
                      id: 'painforest-spread-branch',
                      shape: 'cylinder',
                      params: { bottomR: 0.045, topR: 0.025, height: 0.3, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 1, y: 0, z: 0 },
                        localAngle: 0.7,
                      },
                      stretch: {
                        y: { min: 0.9, max: 1.2, seed: 6 },
                        x: false,
                        z: false,
                      },
                      color: 0x8b5e3c,
                      biomeColor: { source: 'wood', influence: 0.6 },
                    },
                    {
                      id: 'painforest-spread-canopy',
                      shape: 'sphere',
                      params: { radius: 0.26 },
                      transform: { localPos: { x: 0, y: 0.66, z: 0.25 } },
                      color: 0x2e5d2e,
                      biomeColor: { source: 'foliage', influence: 0.8 },
                    },
                  ],
                },
              ],
            },
            {
              id: 'painforest-style-swept',
              weight: 0.35,
              parts: [
                {
                  id: 'painforest-branch-swept',
                  transform: {
                    localPos: { x: 0.02, y: 0.45, z: 0 },
                    localAxis: { x: 0, y: 0, z: 1 },
                    localAngle: 0.2,
                  },
                  children: [
                    {
                      id: 'painforest-swept-branch',
                      shape: 'cylinder',
                      params: { bottomR: 0.03, topR: 0.02, height: 0.28, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 0, y: 0, z: 1 },
                        localAngle: 0.959,
                      },
                      stretch: {
                        y: { min: 0.9, max: 1.2, seed: 6 },
                        x: false,
                        z: false,
                      },
                      color: 0x8b5e3c,
                      biomeColor: { source: 'wood', influence: 0.6 },
                    },
                    {
                      id: 'painforest-swept-canopy',
                      shape: 'sphere',
                      params: { radius: 0.24 },
                      transform: { localPos: { x: -0.36, y: 0.5, z: 0 } },
                      color: 0x336033,
                      biomeColor: { source: 'foliage', influence: 0.8 },
                    },
                  ],
                },
              ],
            },
            {
              id: 'painforest-style-twotier',
              weight: 0.2,
              parts: [
                {
                  id: 'painforest-branch-twotier',
                  transform: {
                    localPos: { x: 0.02, y: 0.5, z: 0 },
                    localAxis: { x: 1, y: 0, z: 0 },
                    localAngle: 0.1,
                  },
                  children: [
                    {
                      id: 'painforest-twotier-branch',
                      shape: 'cylinder',
                      params: { bottomR: 0.05, topR: 0.03, height: 0.3, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 1, y: 0, z: 0 },
                        localAngle: 0.6,
                      },
                      stretch: {
                        y: { min: 0.9, max: 1.2, seed: 6 },
                        x: false,
                        z: false,
                      },
                      color: 0x8b5e3c,
                      biomeColor: { source: 'wood', influence: 0.6 },
                    },
                    {
                      id: 'painforest-twotier-canopy',
                      shape: 'sphere',
                      params: { radius: 0.26 },
                      transform: { localPos: { x: 0, y: 0.6, z: 0.2 } },
                      color: 0x2e5d2e,
                      biomeColor: { source: 'foliage', influence: 0.8 },
                    },
                    {
                      id: 'painforest-twotier-canopy-b',
                      shape: 'sphere',
                      params: { radius: 0.18 },
                      transform: { localPos: { x: -0.3, y: 0.28, z: 0.14 } },
                      color: 0x3a7030,
                      biomeColor: { source: 'foliage', influence: 0.8 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'dead',
      weight: 0.1,
      biomeWeight: {
        biome_sere_wastes: 5,
        biome_tundra: 0.4,
        biome_frigid_silence: 0.2,
        biome_edenfall: 0.1,
        biome_dustbleed: 0.5,
        biome_mourning_marsh: 0.3,
        biome_painforest: 0.05,
        biome_scorch: 2,
      },
      parts: [
        {
          id: 'dead-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.15, topR: 0.09, height: 0.5 },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x7a6a55,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
        {
          id: 'dead-branch-a',
          shape: 'cylinder',
          params: { bottomR: 0.035, topR: 0.02, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.01, y: 0.35, z: -0.1 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -0.7504915783575618,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
        {
          id: 'dead-branch-b',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.018, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.07, y: 0.36, z: 0.02 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: 0.5235987755982989,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
        {
          id: 'dead-branch-c',
          shape: 'cylinder',
          params: { bottomR: 0.025, topR: 0.015, height: 0.2, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.35, z: 0.13 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 1.25,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
      ],
    },
  ],
};
