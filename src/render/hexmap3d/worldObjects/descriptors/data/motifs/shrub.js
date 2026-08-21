/**
 * data/motifs/shrub.js — Shared motif: "shrub".
 *
 * A small-medium bush (larger than a flower, smaller than a tree): short stems
 * under a foliage cluster. The foliage style is a per-biome choice point — a
 * lush, dense green cluster or a sparse, dry scrub — so the shrub reads
 * regionally (scrub in the wastes, lush in the painforest) rather than identical
 * everywhere. Hand-authored geometry source of truth — any decor's motif table
 * can reference it by `{ motif: 'shrub', weight, ... }`.
 */
export const SHRUB_MOTIF = {
  id: 'shrub',
  parts: [
    {
      id: 'shrub-stems',
      children: [
        {
          id: 'shrub-stem-a',
          shape: 'cylinder',
          params: { bottomR: 0.02, topR: 0.015, height: 0.12, segments: 5 },
          transform: {
            localPos: { x: -0.05, y: 0.06, z: 0 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: 0.25,
          },
          color: 0x6f8f4a,
          biomeColor: { source: 'foliage', influence: 0.5 },
        },
        {
          id: 'shrub-stem-b',
          shape: 'cylinder',
          params: { bottomR: 0.02, topR: 0.015, height: 0.14, segments: 5 },
          transform: {
            localPos: { x: 0.05, y: 0.07, z: 0.02 },
            localAxis: { x: 0, y: 0, z: 1 },
            localAngle: -0.2,
          },
          color: 0x6f8f4a,
          biomeColor: { source: 'foliage', influence: 0.5 },
        },
      ],
    },
    {
      id: 'shrub-foliage',
      seed: 116,
      default: 'shrub-lush',
      alternatives: [
        {
          id: 'shrub-lush',
          weight: 0.5,
          biomeWeight: { biome_sere_wastes: 0 },
          parts: [
            {
              id: 'shrub-lush-a',
              shape: 'sphere',
              params: { radius: 0.09 },
              transform: { localPos: { x: 0, y: 0.16, z: 0 } },
              color: 0x5f8a46,
              biomeColor: { source: 'foliage', influence: 0.5 },
            },
            {
              id: 'shrub-lush-b',
              shape: 'sphere',
              params: { radius: 0.07 },
              transform: { localPos: { x: 0.09, y: 0.12, z: 0.03 } },
              color: 0x5f8a46,
              biomeColor: { source: 'foliage', influence: 0.5 },
            },
            {
              id: 'shrub-lush-c',
              shape: 'sphere',
              params: { radius: 0.07 },
              transform: { localPos: { x: -0.09, y: 0.13, z: -0.02 } },
              color: 0x5f8a46,
              biomeColor: { source: 'foliage', influence: 0.5 },
            },
          ],
        },
        {
          id: 'shrub-scrub',
          weight: 0.5,
          biomeWeight: { biome_painforest: 0 },
          parts: [
            {
              id: 'shrub-scrub-a',
              shape: 'sphere',
              params: { radius: 0.07 },
              transform: {
                localPos: { x: 0, y: 0.15, z: 0 },
                scaleX: 1.2,
                scaleY: 0.7,
                scaleZ: 1.2,
              },
              color: 0x9a8845,
              biomeColor: { source: 'terrain', influence: 0.5 },
            },
            {
              id: 'shrub-scrub-b',
              shape: 'sphere',
              params: { radius: 0.05 },
              transform: { localPos: { x: 0.08, y: 0.11, z: 0.02 } },
              color: 0x9a8845,
              biomeColor: { source: 'terrain', influence: 0.5 },
            },
          ],
        },
      ],
    },
  ],
};
