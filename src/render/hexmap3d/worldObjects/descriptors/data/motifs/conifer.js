/**
 * data/motifs/conifer.js — Shared motif: "conifer".
 *
 * The conifer tree from Forest terrain. Hand-authored geometry source
 * of truth — any decor's motif table can reference it by
 * `{ motif: 'conifer', weight, ... }`.
 */
export const CONIFER_MOTIF = {
  id: 'conifer',
  parts: [
    {
      id: 'conifer-trunk',
      shape: 'cylinder',
      params: { bottomR: 0.07, topR: 0.045, height: 0.63 },
      stretch: {
        y: { min: 0.9, max: 1.2, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x8b5e3c,
      biomeColor: { source: 'wood', influence: 0.5 },
      biomeScale: { biome_tundra: 0.8, biome_scorch: 0.6, biome_sere_wastes: 0.7 },
    },
    {
      id: 'conifer-tier-1',
      shape: 'cone',
      params: { bottomR: 0.33, height: 0.32, radialSegs: 7 },
      stretch: {
        y: { min: 0.95, max: 1.1, seed: 6 },
        x: { min: 0.95, max: 1.08, seed: 5 },
        z: { min: 0.95, max: 1.08, seed: 5 },
      },
      color: 0x245c26,
      biomeColor: { source: 'foliage', influence: 0.7 },
      biomeScale: { biome_tundra: 0.8, biome_scorch: 0.6, biome_sere_wastes: 0.7 },
      transform: {
        y: 0.2,
        lift: 0,
        liftRange: { min: 0.02, max: 0.08, seed: 6 },
      },
    },
    {
      id: 'conifer-tier-2',
      shape: 'cone',
      params: { bottomR: 0.26, height: 0.28, radialSegs: 7 },
      stretch: {
        y: { min: 0.95, max: 1.1, seed: 6 },
        x: { min: 0.95, max: 1.08, seed: 5 },
        z: { min: 0.95, max: 1.08, seed: 5 },
      },
      color: 0x2a662c,
      biomeColor: { source: 'foliage', influence: 0.7 },
      biomeScale: { biome_tundra: 0.8, biome_scorch: 0.6, biome_sere_wastes: 0.7 },
      transform: {
        y: 0.2,
        lift: 0,
        liftRange: { min: 0.24, max: 0.36, seed: 6 },
      },
    },
    {
      id: 'conifer-tier-3',
      shape: 'cone',
      params: { bottomR: 0.18, height: 0.24, radialSegs: 7 },
      stretch: {
        y: { min: 0.95, max: 1.1, seed: 6 },
        x: { min: 0.95, max: 1.08, seed: 5 },
        z: { min: 0.95, max: 1.08, seed: 5 },
      },
      color: 0x317034,
      biomeColor: { source: 'foliage', influence: 0.7 },
      biomeScale: { biome_tundra: 0.8, biome_scorch: 0.6, biome_sere_wastes: 0.7 },
      transform: {
        y: 0.2,
        lift: 0,
        liftRange: { min: 0.42, max: 0.58, seed: 6 },
      },
    },
  ],
};
