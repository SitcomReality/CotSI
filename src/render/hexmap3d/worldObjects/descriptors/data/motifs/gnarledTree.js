/**
 * data/motifs/gnarledTree.js — Shared motif: "gnarledTree".
 *
 * The gnarled tree (formerly painforest) — the canonical species
 * the Painforest biome leans on. Hand-authored geometry source
 * of truth — any decor's motif table can reference it by
 * `{ motif: 'gnarledTree', weight, ... }`.
 */
export const GNARLED_TREE_MOTIF = {
  id: 'gnarledTree',
  parts: [
    {
      id: 'gnarledTree-trunk-base',
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
      color: 0x8b5e3c,
      biomeColor: { source: 'wood', influence: 0.6 },
    },
    {
      id: 'gnarledTree-trunk-upper',
      shape: 'cylinder',
      params: { topR: 0.05, height: 0.24, segments: 5 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.3, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -0.15,
      },
      stretch: {
        y: { min: 0.9, max: 1.15, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x8b5e3c,
      biomeColor: { source: 'wood', influence: 0.6 },
    },
    {
      id: 'gnarledTree-branch-split',
      seed: 102,
      default: 'gnarledTree-style-spread',
      alternatives: [
        {
          id: 'gnarledTree-style-spread',
          weight: 0.45,
          parts: [
            {
              id: 'gnarledTree-branch-spread',
              transform: {
                localPos: { x: 0.02, y: 0.52, z: 0.03 },
                localAxis: { x: 1, y: 0, z: 0 },
                localAngle: 0,
              },
              children: [
                {
                  id: 'gnarledTree-spread-branch',
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
                  id: 'gnarledTree-spread-canopy',
                  shape: 'sphere',
                  params: { radius: 0.26 },
                  transform: { localPos: { x: -0.06, y: 0.13, z: 0.2 } },
                  color: 0x2e5d2e,
                  biomeColor: { source: 'foliage', influence: 0.8 },
                },
              ],
            },
          ],
        },
        {
          id: 'gnarledTree-style-swept',
          weight: 0.35,
          parts: [
            {
              id: 'gnarledTree-branch-swept',
              transform: {
                localPos: { x: 0.02, y: 0.45, z: 0 },
                localAxis: { x: 0, y: 0, z: 1 },
                localAngle: 0.2,
              },
              children: [
                {
                  id: 'gnarledTree-swept-branch',
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
                  id: 'gnarledTree-swept-canopy',
                  shape: 'sphere',
                  params: { radius: 0.24 },
                  transform: { localPos: { x: -0.2, y: 0.1, z: 0.1 } },
                  color: 0x336033,
                  biomeColor: { source: 'foliage', influence: 0.8 },
                },
              ],
            },
          ],
        },
        {
          id: 'gnarledTree-style-twotier',
          weight: 0.2,
          parts: [
            {
              id: 'gnarledTree-branch-twotier',
              transform: {
                localPos: { x: 0.02, y: 0.5, z: 0 },
                localAxis: { x: 1, y: 0, z: 0 },
                localAngle: 0.1,
              },
              children: [
                {
                  id: 'gnarledTree-twotier-branch',
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
                  id: 'gnarledTree-twotier-canopy',
                  shape: 'sphere',
                  params: { radius: 0.26 },
                  transform: { localPos: { x: 0, y: 0.2, z: 0.17 } },
                  color: 0x2e5d2e,
                  biomeColor: { source: 'foliage', influence: 0.8 },
                },
                {
                  id: 'gnarledTree-twotier-canopy-b',
                  shape: 'sphere',
                  params: { radius: 0.18 },
                  transform: { localPos: { x: 0, y: -0.12, z: 0 } },
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
};
