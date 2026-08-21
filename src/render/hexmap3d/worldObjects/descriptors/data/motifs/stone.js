/**
 * data/motifs/stone.js — Shared motif: "stone".
 *
 * The consolidated solid-debris motif. One lump silhouette expressed as
 * material alternatives (rock / boulder / clod / rubble / pebble), gated by
 * `weight` and per-option `biomeWeight`. Hand-authored geometry source of
 * truth — any decor's motif table can reference it by
 * `{ motif: 'stone', weight, ... }`.
 */
export const STONE_MOTIF = {
  id: 'stone',
  parts: [
    {
      id: 'stone-variant',
      seed: 110,
      default: 'stone-lump',
      alternatives: [
        {
          id: 'stone-lump',
          weight: 0.45,
          parts: [
            {
              id: 'stone-lump-a',
              shape: 'dodecahedron',
              params: { radius: 0.12 },
              transform: { scaleY: 0.75, scaleX: 1.2, scaleZ: 1.1 },
              color: 0x8f9aa0,
              biomeColor: { source: 'terrain', influence: 0.4 },
            },
          ],
        },
        {
          id: 'rock-lump',
          weight: 0.25,
          parts: [
            {
              id: 'rock-lump-a',
              shape: 'dodecahedron',
              params: { radius: 0.13 },
              transform: { scaleX: 1.2, scaleY: 0.7, scaleZ: 1.1 },
              color: 0xc49a6c,
              biomeColor: { source: 'terrain', influence: 0.45 },
            },
          ],
        },
        {
          id: 'boulder-lump',
          weight: 0.15,
          parts: [
            {
              id: 'boulder-lump-a',
              shape: 'dodecahedron',
              params: { radius: 0.11 },
              transform: { scaleY: 0.8, scaleX: 1.2, scaleZ: 1.1 },
              color: 0x8b7f6b,
              biomeColor: { source: 'terrain', influence: 0.35 },
            },
          ],
        },
        {
          id: 'clod-block',
          weight: 0.08,
          biomeWeight: { biome_sere_wastes: 1.5 },
          parts: [
            {
              id: 'clod-block-a',
              shape: 'cube',
              params: { size: 0.06 },
              transform: { localPos: { x: -0.08, y: 0, z: 0.14 } },
              color: 0xcbbf9e,
            },
          ],
        },
        {
          id: 'rubble-block',
          weight: 0.07,
          parts: [
            {
              id: 'rubble-block-a',
              shape: 'cube',
              params: { size: 0.06 },
              transform: { localPos: { x: 0.22, y: 0, z: -0.04 }, localAxis: { x: 1, y: 0, z: 1 }, localAngle: 0.6 },
              color: 0x8f8069,
              biomeColor: { source: 'terrain', influence: 0.25 },
            },
          ],
        },
        {
          id: 'orb-pebble',
          weight: 0.05,
          biomeWeight: { biome_edenfall: 1.2 },
          parts: [
            {
              id: 'orb-pebble-a',
              shape: 'sphere',
              params: { radius: 0.04 },
              transform: { localPos: { x: -0.02, y: 0.08, z: 0.12 } },
              color: 0xe4ccf5,
              biomeColor: { source: 'exotic', influence: 0.7 },
            },
          ],
        },
      ],
    },
  ],
};
