/**
 * data/motifs/log.js — Shared motif: "log".
 *
 * A multi-part log object — body, stub, and a per-biome organic overgrowth
 * choice (moss + two shelf fungi, or bare). The overgrowth is a per-biome bias:
 * wet, mild biomes grow moss and fungi; dry, open biomes lie bare.
 *
 * Hand-authored geometry source of truth — any decor's motif
 * table can reference it by `{ motif: 'log', weight, ... }`.
 */
export const LOG_MOTIF = {
  id: 'log',
  size: { min: 0.95, max: 1.15 },
  placement: { leanMin: 0.06, leanMax: 0.2 },
  parts: [
    {
      id: 'log-body',
      shape: 'cylinder',
      params: { bottomR: 0.11, topR: 0.085, height: 0.55, segments: 7 },
      stretch: {
        y: { min: 0.85, max: 1.25, seed: 33 },
        x: false,
        z: false,
      },
      color: 0x6a5746,
      biomeColor: { source: 'wood', influence: 0.55 },
      transform: {
        y: 0.105,
        localPos: { x: 0.26484129245482146, y: -0.2487839029699837, z: 0.04078174227210436 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 1.62,
      },
    },
    {
      id: 'log-stub',
      shape: 'cylinder',
      params: { bottomR: 0.032, topR: 0.02, height: 0.14, segments: 5 },
      stretch: {
        y: { min: 0.8, max: 1.2, seed: 31 },
        x: false,
        z: false,
      },
      color: 0x6a5746,
      biomeColor: { source: 'wood', influence: 0.55 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.08, y: 0.16, z: 0.03 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.25,
      },
    },
    {
      // The organic overgrowth (moss + two shelf fungi) is a per-biome choice
      // point: logs in the dry, open biomes lie bare, while the wet, mild
      // biomes grow moss and fungi. Seed 117 (next free alternatives lane).
      id: 'log-overgrowth',
      seed: 117,
      default: 'log-overgrowth-present',
      alternatives: [
        {
          id: 'log-overgrowth-none',
          weight: 0.3,
          biomeWeight: {
            biome_sere_wastes: 2, biome_scorch: 2, biome_dustbleed: 2,
            biome_frigid_silence: 1.4, biome_tundra: 1.3,
          },
          parts: [],
        },
        {
          id: 'log-overgrowth-present',
          weight: 0.7,
          biomeWeight: {
            biome_sere_wastes: 0.4, biome_scorch: 0.5, biome_dustbleed: 0.5,
            biome_edenfall: 1.2, biome_painforest: 1.2, biome_mourning_marsh: 1.2,
            biome_default: 1.1,
          },
          parts: [
            {
              id: 'log-moss',
              shape: 'sphere',
              params: { radius: 0.09 },
              stretch: {
                y: { min: 0.85, max: 1.15, seed: 32 },
                x: false,
                z: false,
              },
              color: 0x4f6b38,
              biomeColor: { source: 'foliage', influence: 0.75 },
              transform: {
                y: 0,
                lift: 0,
                scaleX: 1.3,
                scaleY: 0.45,
                scaleZ: 1.1,
                localPos: { x: -0.11638297282958757, y: -0.015871468208349997, z: 0.0704688616173255 },
              },
            },
            {
              id: 'log-fungus-a',
              shape: 'sphere',
              params: { radius: 0.045 },
              color: 0xb98a5e,
              biomeColor: { source: 'bloom', influence: 0.3 },
              transform: {
                y: 0,
                lift: 0,
                scaleY: 0.4,
                localPos: { x: 0.022841750442331218, y: -0.01603161715746917, z: -0.0660618605006247 },
              },
            },
            {
              id: 'log-fungus-b',
              shape: 'sphere',
              params: { radius: 0.035 },
              color: 0xb98a5e,
              biomeColor: { source: 'bloom', influence: 0.3 },
              transform: {
                y: 0,
                lift: 0,
                scaleY: 0.4,
                localPos: { x: -0.03795179263937237, y: 0.034746903636999914, z: 0.11725354654370354 },
              },
            },
          ],
        },
      ],
    },
  ],
};
