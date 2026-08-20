/**
 * data/motifs/deadTree.js — Shared motif: "deadTree".
 *
 * The dead tree from Forest terrain. Hand-authored geometry
 * source of truth — any decor's motif table can reference it by
 * `{ motif: 'deadTree', weight, ... }`.
 */
export const DEAD_TREE_MOTIF = {
  id: 'deadTree',
  size: { min: 1.35, max: 1.6 },
  parts: [
    {
      id: 'deadTree-root-a',
      shape: 'cylinder',
      params: { bottomR: 0.055, topR: 0.012, height: 0.14, segments: 5 },
      stretch: {
        y: { min: 0.85, max: 1.2, seed: 11 },
        x: false,
        z: false,
      },
      color: 0x7a6a55,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: {
        localPos: { x: 0.12, y: 0, z: 0.02 },
        localAxis: { x: 0, y: 0, z: -1 },
        localAngle: 1.1,
      },
    },
    {
      id: 'deadTree-root-b',
      shape: 'cylinder',
      params: { bottomR: 0.055, topR: 0.012, height: 0.14, segments: 5 },
      stretch: {
        y: { min: 0.85, max: 1.2, seed: 12 },
        x: false,
        z: false,
      },
      color: 0x7a6a55,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.11, y: 0, z: 0.07 },
        localAxis: { x: 0.54, y: 0, z: 0.84 },
        localAngle: 1.2,
      },
    },
    {
      id: 'deadTree-root-c',
      shape: 'cylinder',
      params: { bottomR: 0.05, topR: 0.01, height: 0.12, segments: 5 },
      stretch: {
        y: { min: 0.85, max: 1.2, seed: 13 },
        x: false,
        z: false,
      },
      color: 0x7a6a55,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.02, y: 0, z: -0.13 },
        localAxis: { x: -1, y: 0, z: -0.15 },
        localAngle: 1,
      },
    },
    {
      id: 'deadTree-trunk-base',
      shape: 'cylinder',
      params: { bottomR: 0.16, topR: 0.11, height: 0.34 },
      stretch: {
        y: { min: 0.95, max: 1.15, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x7a6a55,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: { y: 0, lift: 0 },
    },
    {
      id: 'deadTree-trunk-mid',
      shape: 'cylinder',
      params: { bottomR: 0.105, topR: 0.07, height: 0.3 },
      stretch: {
        y: { min: 0.9, max: 1.15, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x7a6a55,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.015, y: 0.31, z: -0.01 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.17,
      },
    },
    {
      id: 'deadTree-branch-low',
      transform: {
        localPos: { x: 0.05, y: 0.26, z: 0.04 },
        localAxis: { x: -0.25, y: 0, z: -1 },
        localAngle: 1,
      },
      children: [
        {
          id: 'deadTree-low-seg',
          shape: 'cylinder',
          params: { bottomR: 0.04, topR: 0.024, height: 0.24, segments: 5 },
          transform: {
            localPos: { x: 0, y: 0, z: 0 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.15,
          },
          stretch: {
            y: { min: 0.85, max: 1.2, seed: 7 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
        {
          id: 'deadTree-low-twig',
          shape: 'cylinder',
          params: { bottomR: 0.016, topR: 0.008, height: 0.15, segments: 5 },
          transform: {
            localPos: { x: -0.018479279645075345, y: 0.1781183973530193, z: 0.017039722267788826 },
            localAxis: { x: 1, y: 0, z: 0.2 },
            localAngle: -0.55,
          },
          stretch: {
            y: { min: 0.85, max: 1.2, seed: 8 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
      ],
    },
    {
      id: 'deadTree-branch-mid',
      transform: {
        localPos: { x: -0.06, y: 0.38, z: -0.03 },
        localAxis: { x: 0.45, y: 0, z: 0.9 },
        localAngle: 0.85,
      },
      children: [
        {
          id: 'deadTree-mid-seg',
          shape: 'cylinder',
          params: { bottomR: 0.034, topR: 0.02, height: 0.22, segments: 5 },
          transform: { localPos: { x: 0, y: 0, z: 0 } },
          stretch: {
            y: { min: 0.85, max: 1.2, seed: 9 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
        {
          id: 'deadTree-mid-twig',
          shape: 'cylinder',
          params: { bottomR: 0.014, topR: 0.007, height: 0.13, segments: 5 },
          transform: {
            localPos: { x: 0, y: 0.18, z: 0 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: -0.5,
          },
          stretch: {
            y: { min: 1, max: 5, seed: 10 },
            x: false,
            z: false,
          },
          color: 0x6e5f4d,
          biomeColor: { source: 'wood', influence: 0.5 },
        },
      ],
    },
    {
      id: 'deadTree-branch-high',
      shape: 'cylinder',
      params: { bottomR: 0.028, topR: 0.012, height: 0.26, segments: 5 },
      stretch: {
        y: { min: 0.85, max: 1.2, seed: 21 },
        x: false,
        z: false,
      },
      color: 0x6e5f4d,
      biomeColor: { source: 'wood', influence: 0.5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.045964071971472, y: 0.48014456850390735, z: -0.10210523042359432 },
        localAxis: { x: 0.8, y: 0, z: 0.5 },
        localAngle: 5.602506898901797,
      },
    },
    {
      id: 'deadTree-crown',
      seed: 104,
      default: 'deadTree-crown-snapped',
      alternatives: [
        {
          id: 'deadTree-crown-snapped',
          weight: 0.4,
          parts: [
            {
              id: 'deadTree-snap',
              transform: {
                localPos: { x: 0.01, y: 0.56, z: 0.02 },
                localAxis: { x: 0.6, y: 0, z: 0.8 },
                localAngle: 0.45,
              },
              children: [
                {
                  id: 'deadTree-snap-stub',
                  shape: 'cylinder',
                  params: { bottomR: 0.06, topR: 0.026, height: 0.15, segments: 5 },
                  transform: { localPos: { x: 0, y: 0, z: 0 } },
                  stretch: {
                    y: { min: 0.9, max: 1.15, seed: 22 },
                    x: false,
                    z: false,
                  },
                  color: 0x7a6a55,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
                {
                  id: 'deadTree-snap-splinter',
                  shape: 'cylinder',
                  params: { bottomR: 0.013, topR: 0.005, height: 0.12, segments: 5 },
                  transform: {
                    localPos: { x: -0.008933440508663647, y: 0.12685773103817774, z: -0.012751763228681448 },
                    localAxis: { x: -0.5, y: 0, z: 1 },
                    localAngle: 0.95,
                  },
                  stretch: {
                    y: { min: 1, max: 3, seed: 23 },
                    x: { min: 1, max: 5, seed: 5 },
                    z: { min: 1, max: 5, seed: 5 },
                  },
                  color: 0x6e5f4d,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
              ],
            },
            {
              id: 'deadTree-tuft',
              shape: 'sphere',
              params: { radius: 0.1 },
              stretch: {
                y: { min: 0.8, max: 1.2, seed: 24 },
                x: { min: 0.9, max: 1.15, seed: 24 },
                z: { min: 0.9, max: 1.15, seed: 24 },
              },
              color: 0x77764e,
              biomeColor: { source: 'foliage', influence: 0.3 },
              transform: {
                y: 0.54,
                lift: 0,
                localPos: { x: 0.03, y: 0.04, z: 0.01 },
              },
            },
          ],
        },
        {
          id: 'deadTree-crown-fork',
          weight: 0.35,
          parts: [
            {
              id: 'deadTree-fork-a',
              transform: {
                localPos: { x: 0.01, y: 0.55, z: 0 },
                localAxis: { x: 0.2, y: 0, z: -1 },
                localAngle: 0.6,
              },
              children: [
                {
                  id: 'deadTree-fork-a-stem',
                  shape: 'cylinder',
                  params: { bottomR: 0.045, topR: 0.018, height: 0.3, segments: 5 },
                  transform: { localPos: { x: 0, y: 0, z: 0 } },
                  stretch: {
                    y: { min: 0.9, max: 1.2, seed: 25 },
                    x: false,
                    z: false,
                  },
                  color: 0x7a6a55,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
                {
                  id: 'deadTree-fork-a-twig',
                  shape: 'cylinder',
                  params: { bottomR: 0.011, topR: 0.005, height: 0.14, segments: 5 },
                  transform: {
                    localPos: { x: 0, y: 0.26, z: 0 },
                    localAxis: { x: 1, y: 0, z: 0.15 },
                    localAngle: -0.5,
                  },
                  stretch: {
                    y: { min: 0.9, max: 1.2, seed: 26 },
                    x: false,
                    z: false,
                  },
                  color: 0x6e5f4d,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
              ],
            },
            {
              id: 'deadTree-fork-b',
              transform: {
                localPos: { x: -0.01, y: 0.54, z: 0.01 },
                localAxis: { x: -0.3, y: 0, z: 1 },
                localAngle: 0.5,
              },
              children: [
                {
                  id: 'deadTree-fork-b-stem',
                  shape: 'cylinder',
                  params: { bottomR: 0.04, topR: 0.015, height: 0.26, segments: 5 },
                  transform: { localPos: { x: 0, y: 0, z: 0 } },
                  stretch: {
                    y: { min: 0.9, max: 1.2, seed: 27 },
                    x: false,
                    z: false,
                  },
                  color: 0x7a6a55,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
              ],
            },
          ],
        },
        {
          id: 'deadTree-crown-gnarl',
          weight: 0.25,
          parts: [
            {
              id: 'deadTree-gnarl-1',
              transform: {
                localPos: { x: 0, y: 0.54, z: 0 },
                localAxis: { x: 1, y: 0, z: 0 },
                localAngle: 0.3,
              },
              children: [
                {
                  id: 'deadTree-gnarl-seg-1',
                  shape: 'cylinder',
                  params: { bottomR: 0.045, topR: 0.026, height: 0.2, segments: 5 },
                  transform: { localPos: { x: 0, y: 0, z: 0 } },
                  stretch: {
                    y: { min: 0.9, max: 1.15, seed: 28 },
                    x: false,
                    z: false,
                  },
                  color: 0x7a6a55,
                  biomeColor: { source: 'wood', influence: 0.5 },
                },
                {
                  id: 'deadTree-gnarl-2',
                  transform: {
                    localPos: { x: 0.005, y: 0.18, z: 0 },
                    localAxis: { x: 0.15, y: 0, z: 1 },
                    localAngle: -0.6,
                  },
                  children: [
                    {
                      id: 'deadTree-gnarl-seg-2',
                      shape: 'cylinder',
                      params: { bottomR: 0.024, topR: 0.013, height: 0.17, segments: 5 },
                      transform: { localPos: { x: 0, y: 0, z: 0 } },
                      stretch: {
                        y: { min: 0.9, max: 1.15, seed: 29 },
                        x: false,
                        z: false,
                      },
                      color: 0x6e5f4d,
                      biomeColor: { source: 'wood', influence: 0.5 },
                    },
                    {
                      id: 'deadTree-gnarl-tip',
                      shape: 'cylinder',
                      params: { bottomR: 0.011, topR: 0.004, height: 0.13, segments: 5 },
                      transform: {
                        localPos: { x: 0, y: 0.15, z: 0 },
                        localAxis: { x: 1, y: 0, z: -0.2 },
                        localAngle: 0.55,
                      },
                      stretch: {
                        y: { min: 0.9, max: 1.2, seed: 30 },
                        x: false,
                        z: false,
                      },
                      color: 0x6e5f4d,
                      biomeColor: { source: 'wood', influence: 0.5 },
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
