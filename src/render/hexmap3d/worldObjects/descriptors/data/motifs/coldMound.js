/**
 * data/motifs/coldMound.js — Shared motif: "coldMound".
 *
 * The cold mound (tundra/frigid silence variant) — a
 * spheroid mound with an agave and a spar. Hand-authored
 * geometry source of truth — any decor's motif table can
 * reference it by `{ motif: 'coldMound', weight, ... }`.
 */
export const COLD_MOUND_MOTIF = {
  id: 'coldMound',
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
};
