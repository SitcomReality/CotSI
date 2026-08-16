/**
 * decor/marsh.js — Descriptor data for "Marsh Reeds".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const MARSH_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'marsh',
  kind: 'decor',
  displayName: 'Marsh decor',
  cluster: { rule: 'moisture', countsByTerrain: { marsh: [5, 8] }, densityRange: [0.45, 0.85], jitter: 1 },
  size: { min: 0.9, max: 1.25 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.4, separation: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.5,
  motifs: [
    {
      id: 'cattail',
      weight: 0.25,
      parts: [
        {
          id: 'cattail-stalk',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.032, height: 0.45, segments: 6 },
          transform: { localPos: { x: -0.14, y: 0, z: -0.06 } },
          stretch: { y: { min: 0.9, max: 1.25, seed: 6 }, x: false, z: false },
          color: 0x5b7138,
          biomeColor: { source: 'foliage', influence: 0.35 },
        },
        {
          id: 'cattail-head',
          shape: 'cylinder', params: { bottomR: 0.045, topR: 0.04, height: 0.11, segments: 6 },
          // The head's lift tracks the stalk's stretch (same seed 6), so the
          // head always sits on top of ITS stalk — the pair must stay in one
          // motif.
          transform: { liftRange: { min: 0.36, max: 0.52, seed: 6 }, localPos: { x: -0.14, y: 0, z: -0.06 } },
          stretch: { x: false, y: false, z: false },
          color: 0x8c5a3a,
        },
      ],
    },
    {
      id: 'mud',
      weight: 0.25,
      parts: [
        {
          id: 'mud-bank',
          shape: 'spheroid', params: { radius: 0.13 },
          transform: { localPos: { x: -0.05, y: 0, z: 0.02 }, scaleY: 0.55, scaleX: 1.5, scaleZ: 1.5 },
          color: 0x5a4c3a,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'tussock',
      weight: 0.2,
      parts: [
        {
          id: 'tussock-a',
          shape: 'cone', params: { bottomR: 0.2, height: 0.24, radialSegs: 6, heightSegs: 1 },
          transform: { localPos: { x: 0.03, y: 0, z: -0.04 }, scaleY: 0.8, scaleX: 1.4, scaleZ: 1.4 },
          color: 0x4b7040,
          biomeColor: { source: 'foliage', influence: 0.55 },
        },
      ],
    },
    {
      id: 'pad',
      weight: 0.15,
      parts: [
        {
          id: 'lily-pad',
          shape: 'cylinder', params: { bottomR: 0.13, topR: 0.13, height: 0.02, segments: 6 },
          transform: { localPos: { x: -0.03, y: 0.01, z: 0.12 } },
          color: 0x3e7c50,
          biomeColor: { source: 'foliage', influence: 0.6 },
        },
      ],
    },
    {
      id: 'crust',
      weight: 0.05,
      biomeWeight: { biome_scorch: 0.7 },
      parts: [
        {
          id: 'silt-crust',
          shape: 'spheroid', params: { radius: 0.13 },
          transform: { localPos: { x: 0.02, y: 0, z: -0.02 }, scaleY: 0.35, scaleX: 1.6, scaleZ: 1.6 },
          color: 0x8d7957,
          biomeColor: { source: 'terrain', influence: 0.55 },
        },
      ],
    },
    {
      id: 'bone',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.7 },
      parts: [
        {
          id: 'bone-stalk-a',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.018, height: 0.36, segments: 5 },
          transform: { localPos: { x: -0.12, y: 0, z: -0.03 } },
          stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
          color: 0xd0c3a6,
          biomeColor: { source: 'terrain', influence: 0.55 },
        },
        {
          id: 'bone-stalk-b',
          shape: 'cylinder', params: { bottomR: 0.022, topR: 0.016, height: 0.28, segments: 5 },
          transform: { localPos: { x: 0.14, y: 0, z: 0.04 } },
          stretch: { y: { min: 0.9, max: 1.2, seed: 8 }, x: false, z: false },
          color: 0xc4b896,
          biomeColor: { source: 'terrain', influence: 0.55 },
        },
      ],
    },
    {
      id: 'orb',
      weight: 0.04,
      biomeWeight: { biome_edenfall: 0.8 },
      parts: [
        {
          id: 'fen-orb',
          shape: 'sphere', params: { radius: 0.04 },
          transform: { localPos: { x: -0.02, y: 0.08, z: 0.12 } },
          color: 0xe4ccf5,
          biomeColor: { source: 'exotic', influence: 0.7 },
        },
      ],
    },
    {
      id: 'shard',
      weight: 0.03,
      biomeWeight: { biome_dustbleed: 0.8 },
      parts: [
        {
          id: 'mire-shard',
          shape: 'dodecahedron', params: { radius: 0.05 },
          transform: { localPos: { x: -0.03, y: 0.04, z: 0.12 }, localAngle: 0.5 },
          color: 0x9ff0e8,
          biomeColor: { source: 'exotic', influence: 0.7 },
        },
      ],
    },
  ],
};
