/**
 * decor/desert.js — Descriptor data for "Desert decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DESERT_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'desert',
  kind: 'decor',
  displayName: 'Desert decor',
  cluster: { min: 6, max: 8 },
  size: { min: 0.9, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMax: 0.45, separation: 0.42 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      id: 'cactus',
      weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1 },
      parts: [
        // The trunk — the cactus's one ROOT leaf, always present. Every other
        // part of the cactus lives in a nested (grouped) subtree, so a tile's
        // item count stays one origin per cactus.
        {
          id: 'cactus-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.085, height: 0.55 },
          stretch: {
            y: { min: 0.9, max: 1.25, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x4c8a4a,
          biomeColor: { source: 'foliage', influence: 0.3 },
          biomeScale: { biome_edenfall: 1.1, biome_dustbleed: 1.05 },
        },
        // Arm count — every cactus rolls 0, 1, or 2 arms. Each arm is a GROUP
        // holding its own arm cylinder AND a nested elbow choice, so the two
        // arms of a two-armed cactus roll straight/elbow independently.
        // This is the nested-alternatives pattern (decorComposition.md §2.2).
        {
          id: 'cactus-arms',
          seed: 101,
          default: 'cactus-arms-two',
          alternatives: [
            // none — a bare trunk (the weighted "absent" option).
            { id: 'cactus-arms-none', weight: 0.18, parts: [] },
            // one — a right-side arm, straight or elbow'd.
            {
              id: 'cactus-arms-one',
              weight: 0.32,
              parts: [
                {
                  id: 'cactus-arm-one',
                  transform: { localPos: { x: 0.12, y: 0.24, z: 0 } },
                  children: [
                    {
                      id: 'cactus-arm-one-arm',
                      shape: 'cylinder',
                      params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 0, y: 0, z: 1 },
                        localAngle: -0.9,
                      },
                      color: 0x4c8a4a,
                      biomeColor: { source: 'foliage', influence: 0.3 },
                    },
                    {
                      id: 'cactus-arm-one-tip',
                      seed: 102,
                      default: 'cactus-tip-elbow-one',
                      alternatives: [
                        { id: 'cactus-tip-straight-one', weight: 0.6, parts: [] },
                        {
                          id: 'cactus-tip-elbow-one',
                          weight: 0.4,
                          parts: [
                            {
                              id: 'cactus-rise-one',
                              shape: 'cylinder',
                              params: { bottomR: 0.035, topR: 0.035, height: 0.2, segments: 5 },
                              transform: {
                                localPos: { x: 0.09, y: 0.15, z: 0 },
                                localAxis: { x: 0, y: 0, z: 1 },
                                localAngle: 1.5707963267948966,
                              },
                              color: 0x4c8a4a,
                              biomeColor: { source: 'foliage', influence: 0.3 },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // two — a left and a right arm, each with its own straight/elbow
            // roll (independent nested choice points).
            {
              id: 'cactus-arms-two',
              weight: 0.5,
              parts: [
                {
                  id: 'cactus-arm-left',
                  transform: { localPos: { x: -0.12, y: 0.28, z: 0 } },
                  children: [
                    {
                      id: 'cactus-arm-left-arm',
                      shape: 'cylinder',
                      params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 0, y: 0, z: 1 },
                        localAngle: 0.9,
                      },
                      color: 0x4c8a4a,
                      biomeColor: { source: 'foliage', influence: 0.3 },
                    },
                    {
                      id: 'cactus-arm-left-tip',
                      seed: 103,
                      default: 'cactus-tip-elbow-left',
                      alternatives: [
                        { id: 'cactus-tip-straight-left', weight: 0.6, parts: [] },
                        {
                          id: 'cactus-tip-elbow-left',
                          weight: 0.4,
                          parts: [
                            {
                              id: 'cactus-rise-left',
                              shape: 'cylinder',
                              params: { bottomR: 0.035, topR: 0.035, height: 0.2, segments: 5 },
                              transform: {
                                localPos: { x: -0.09, y: 0.15, z: 0 },
                                localAxis: { x: 0, y: 0, z: 1 },
                                localAngle: 1.5707963267948966,
                              },
                              color: 0x4c8a4a,
                              biomeColor: { source: 'foliage', influence: 0.3 },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'cactus-arm-right',
                  transform: { localPos: { x: 0.12, y: 0.24, z: 0 } },
                  children: [
                    {
                      id: 'cactus-arm-right-arm',
                      shape: 'cylinder',
                      params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0, z: 0 },
                        localAxis: { x: 0, y: 0, z: 1 },
                        localAngle: -0.9,
                      },
                      color: 0x4c8a4a,
                      biomeColor: { source: 'foliage', influence: 0.3 },
                    },
                    {
                      id: 'cactus-arm-right-tip',
                      seed: 104,
                      default: 'cactus-tip-elbow-right',
                      alternatives: [
                        { id: 'cactus-tip-straight-right', weight: 0.6, parts: [] },
                        {
                          id: 'cactus-tip-elbow-right',
                          weight: 0.4,
                          parts: [
                            {
                              id: 'cactus-rise-right',
                              shape: 'cylinder',
                              params: { bottomR: 0.035, topR: 0.035, height: 0.2, segments: 5 },
                              transform: {
                                localPos: { x: 0.09, y: 0.15, z: 0 },
                                localAxis: { x: 0, y: 0, z: 1 },
                                localAngle: 1.5707963267948966,
                              },
                              color: 0x4c8a4a,
                              biomeColor: { source: 'foliage', influence: 0.3 },
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
        },
      ],
    },
    {
      id: 'rock',
      weight: 0.45,
      parts: [
        {
          id: 'rock-a',
          shape: 'dodecahedron',
          params: { radius: 0.13 },
          transform: { scaleX: 1.2, scaleY: 0.7, scaleZ: 1.1 },
          color: 0xc49a6c,
          biomeColor: { source: 'terrain', influence: 0.45 },
        },
      ],
    },
    {
      id: 'shrub',
      weight: 0.2,
      parts: [
        {
          id: 'shrub-a',
          shape: 'cone',
          params: { bottomR: 0.16, height: 0.18, heightSegs: 1 },
          transform: { scaleX: 1.5, scaleY: 0.7, scaleZ: 1.5 },
          color: 0x9a8845,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'cold-mound',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7 },
      parts: [
        {
          id: 'cold-mound-a',
          shape: 'spheroid',
          params: { radius: 0.13 },
          transform: { scaleX: 1.4, scaleY: 0.6, scaleZ: 1.4 },
          color: 0xb4c4c8,
          biomeColor: { source: 'terrain', influence: 0.45 },
          biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
        },
        {
          id: 'cold-agave',
          shape: 'cone',
          params: { bottomR: 0.2, height: 0.18, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            scaleX: 1.6,
            scaleY: 0.55,
            scaleZ: 1.6,
            localPos: { x: -0.05, y: 0, z: -0.05 },
          },
          color: 0x9db8b0,
          biomeColor: { source: 'exotic', influence: 0.55 },
          biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
        },
        {
          id: 'cold-spar',
          shape: 'cylinder',
          params: { bottomR: 0.025, topR: 0.015, height: 0.25, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.22, y: 0, z: 0.12 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: -0.8,
          },
          color: 0xb8d4da,
          biomeColor: { source: 'exotic', influence: 0.5 },
        },
      ],
    },
    {
      id: 'salt-crust',
      weight: 0.1,
      biomeWeight: { biome_mourning_marsh: 0.6 },
      parts: [
        {
          id: 'salt-mound',
          shape: 'spheroid',
          params: { radius: 0.14 },
          transform: { scaleX: 1.6, scaleY: 0.4, scaleZ: 1.6 },
          color: 0x8e9490,
          biomeColor: { source: 'terrain', influence: 0.55 },
        },
        {
          id: 'salt-crust-a',
          shape: 'cube',
          params: { size: 0.07 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.2, y: 0, z: -0.02 },
          },
          color: 0xa5aeab,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
        {
          id: 'salt-stalk',
          shape: 'cylinder',
          params: { bottomR: 0.02, topR: 0.032, height: 0.32, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.14, y: 0, z: -0.06 },
          },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x6f7c76,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'dead-cactus',
      weight: 0.05,
      biomeWeight: { biome_sere_wastes: 0.5, biome_scorch: 0.3 },
      parts: [
        {
          id: 'dead-rib',
          shape: 'cylinder',
          params: { bottomR: 0.045, topR: 0.02, segments: 5 },
          transform: {
            localPos: { x: -0.18, y: 0, z: 0.03 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: -1.1,
          },
          color: 0xe2d7bd,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
        {
          id: 'dead-chip',
          shape: 'cube',
          params: { size: 0.05 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.06, y: 0, z: 0.13 },
          },
          color: 0xe6dcc3,
        },
      ],
    },
  ],
};
