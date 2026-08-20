/**
 * data/motifs/cactus.js — Shared motif: "cactus".
 *
 * The desert cactus — trunk plus arm alternatives.
 * Hand-authored geometry source of truth — any decor's
 * motif table can reference it by `{ motif: 'cactus', weight, ... }`.
 */
export const CACTUS_MOTIF = {
  id: 'cactus',
  parts: [
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
    {
      id: 'cactus-arms',
      seed: 101,
      default: 'cactus-arms-two',
      alternatives: [
        { id: 'cactus-arms-none', weight: 0.18, parts: [] },
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
};
