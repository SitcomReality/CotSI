/**
 * data/motifs/debris.js — Shared ground-debris motifs.
 *
 * Catch-all for all the small single-part detritus objects
 * (mounds of dirt, rocks, moss, spars, flowers, stalks, etc.).
 * Anything composed of two or more parts must live in its own
 * motif file, never in debris.
 *
 * Hand-authored geometry source of truth — any decor's motif
 * table can reference one of these by id
 * (`{ motif: 'clod', weight, ... }`), and normalizeDescriptor
 * materializes the shared parts. Per-use presentation — weight,
 * biomeWeight, and any size/placement overrides — lives on the
 * REFERENCING decor, not here; the `size` / `placement` on a
 * library motif are its defaults, inherited by a ref that
 * doesn't override them.
 *
 * Part ids are prefixed with the motif id so a decor mixing
 * many shared motifs keeps part ids unique (meshAssembly groups
 * by partId).
 */

export const FLOWER_MOTIF = {
  id: 'flower',
  parts: [
    {
      id: 'flower-a',
      shape: 'spheroid',
      params: { radius: 0.06 },
      transform: { localPos: { x: -0.22, y: 0.06, z: -0.08 }, scaleY: 0.7 },
      color: 0xd9a43b,
      biomeColor: { source: 'bloom', influence: 0.5 },
    },
  ],
};

export const STALK_MOTIF = {
  id: 'stalk',
  parts: [
    {
      id: 'stalk-a',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.018, height: 0.2, segments: 5 },
      transform: { localPos: { x: -0.28, y: 0, z: 0.1 } },
      color: 0x6f8c3a,
      biomeColor: { source: 'foliage', influence: 0.45 },
    },
  ],
};

export const CLOD_MOTIF = {
  id: 'clod',
  parts: [
    {
      id: 'clod-a',
      shape: 'cube',
      params: { size: 0.06 },
      transform: { localPos: { x: -0.08, y: 0, z: 0.14 } },
      color: 0xcbbf9e,
    },
  ],
};

export const DRIFTWOOD_MOTIF = {
  id: 'driftwood',
  parts: [
    {
      id: 'driftwood-log',
      shape: 'cylinder',
      params: { bottomR: 0.05, topR: 0.03, height: 0.4, segments: 5 },
      transform: { localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
      stretch: { y: { min: 0.85, max: 1.25, seed: 6 }, x: false, z: false },
      color: 0x9d8a68,
      biomeColor: { source: 'terrain', influence: 0.4 },
    },
  ],
};

export const STONE_MOTIF = {
  id: 'stone',
  parts: [
    {
      id: 'stone-a',
      shape: 'dodecahedron',
      params: { radius: 0.12 },
      transform: { scaleY: 0.75, scaleX: 1.2, scaleZ: 1.1 },
      color: 0x8f9aa0,
      biomeColor: { source: 'terrain', influence: 0.4 },
    },
  ],
};

export const SHELL_MOTIF = {
  id: 'shell',
  parts: [
    {
      id: 'shell-a',
      shape: 'spheroid',
      params: { radius: 0.08 },
      transform: { localPos: { x: -0.1, y: 0, z: -0.12 }, scaleY: 0.55, scaleX: 1.3, scaleZ: 1, localAngle: 0.5 },
      color: 0xe2d4c3,
      biomeColor: { source: 'exotic', influence: 0.5 },
    },
  ],
};

export const GLASS_MOTIF = {
  id: 'glass',
  parts: [
    {
      id: 'glass-shard',
      shape: 'dodecahedron',
      params: { radius: 0.07 },
      transform: { scaleY: 1.4, scaleX: 0.7, scaleZ: 0.7, localAngle: 0.5 },
      color: 0xc994ee,
      biomeColor: { source: 'exotic', influence: 0.7 },
    },
  ],
};

export const WRACK_MOTIF = {
  id: 'wrack',
  parts: [
    {
      id: 'wrack-mound',
      shape: 'spheroid',
      params: { radius: 0.12 },
      transform: { localPos: { x: 0.2, y: 0, z: 0.04 }, scaleY: 0.45, scaleX: 1.4, scaleZ: 1.4 },
      color: 0x3d594d,
      biomeColor: { source: 'wood', influence: 0.55 },
    },
  ],
};

export const MUD_MOTIF = {
  id: 'mud',
  parts: [
    {
      id: 'mud-bank',
      shape: 'spheroid',
      params: { radius: 0.13 },
      transform: { localPos: { x: -0.05, y: 0, z: 0.02 }, scaleY: 0.55, scaleX: 1.5, scaleZ: 1.5 },
      color: 0x5a4c3a,
      biomeColor: { source: 'terrain', influence: 0.5 },
    },
  ],
};

export const TUSSOCK_MOTIF = {
  id: 'tussock',
  parts: [
    {
      id: 'tussock-a',
      shape: 'cone',
      params: { bottomR: 0.2, height: 0.24, radialSegs: 6, heightSegs: 1 },
      transform: { localPos: { x: 0.03, y: 0, z: -0.04 }, scaleY: 0.8, scaleX: 1.4, scaleZ: 1.4 },
      color: 0x4b7040,
      biomeColor: { source: 'foliage', influence: 0.55 },
    },
  ],
};

export const PAD_MOTIF = {
  id: 'pad',
  parts: [
    {
      id: 'lily-pad',
      shape: 'cylinder',
      params: { bottomR: 0.13, topR: 0.13, height: 0.02, segments: 6 },
      transform: { localPos: { x: -0.03, y: 0.01, z: 0.12 } },
      color: 0x3e7c50,
      biomeColor: { source: 'foliage', influence: 0.6 },
    },
  ],
};

export const CRUST_MOTIF = {
  id: 'crust',
  parts: [
    {
      id: 'silt-crust',
      shape: 'spheroid',
      params: { radius: 0.13 },
      transform: { localPos: { x: 0.02, y: 0, z: -0.02 }, scaleY: 0.35, scaleX: 1.6, scaleZ: 1.6 },
      color: 0x8d7957,
      biomeColor: { source: 'terrain', influence: 0.55 },
    },
  ],
};

export const ORB_MOTIF = {
  id: 'orb',
  parts: [
    {
      id: 'fen-orb',
      shape: 'sphere',
      params: { radius: 0.04 },
      transform: { localPos: { x: -0.02, y: 0.08, z: 0.12 } },
      color: 0xe4ccf5,
      biomeColor: { source: 'exotic', influence: 0.7 },
    },
  ],
};

export const RUBBLE_MOTIF = {
  id: 'rubble',
  parts: [
    {
      id: 'rubble-a',
      shape: 'cube',
      params: { size: 0.06 },
      transform: { localPos: { x: 0.22, y: 0, z: -0.04 }, localAxis: { x: 1, y: 0, z: 1 }, localAngle: 0.6 },
      color: 0x8f8069,
      biomeColor: { source: 'terrain', influence: 0.25 },
    },
  ],
};

export const CRYSTAL_MOTIF = {
  id: 'crystal',
  parts: [
    {
      id: 'crystal-a',
      shape: 'dodecahedron',
      params: { radius: 0.12 },
      transform: { localPos: { x: -0.15, y: 0, z: 0 }, scaleY: 1.8, scaleX: 0.8, scaleZ: 0.8, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.3 },
      color: 0xb78be6,
      biomeColor: { source: 'exotic', influence: 0.7 },
      biomeScale: { biome_edenfall: 1.1 },
    },
  ],
};

export const SHRUB_MOTIF = {
  id: 'shrub',
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
};
