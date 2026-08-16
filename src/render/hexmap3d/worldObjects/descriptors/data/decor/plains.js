/**
 * decor/plains.js — Descriptor data for "Plains Meadow".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLAINS_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'plains',
  kind: 'decor',
  displayName: 'Plains decor',
  cluster: { min: 5, max: 8, rule: 'uniform' },
  size: { min: 0.8, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.38, separation: 0.32 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      id: 'tuft',
      weight: 0.35,
      parts: [
        {
          id: 'tuft-a',
          shape: 'cone', params: { bottomR: 0.22, height: 0.22, radialSegs: 6, heightSegs: 1 },
          transform: { scaleY: 0.8, scaleX: 1.5, scaleZ: 1.5 },
          color: 0x6e9c46,
          biomeColor: { source: 'foliage', influence: 0.55 },
        },
      ],
    },
    {
      id: 'boulder',
      weight: 0.25,
      parts: [
        {
          id: 'boulder-a',
          shape: 'dodecahedron', params: { radius: 0.11 },
          transform: { scaleY: 0.8, scaleX: 1.2, scaleZ: 1.1 },
          color: 0x8b7f6b,
          biomeColor: { source: 'terrain', influence: 0.35 },
        },
      ],
    },
    {
      id: 'flower',
      weight: 0.15,
      parts: [
        {
          id: 'flower-a',
          shape: 'spheroid', params: { radius: 0.06 },
          transform: { localPos: { x: -0.22, y: 0.06, z: -0.08 }, scaleY: 0.7 },
          color: 0xd9a43b,
          biomeColor: { source: 'bloom', influence: 0.5 },
        },
      ],
    },
    {
      id: 'stalk',
      weight: 0.15,
      parts: [
        {
          id: 'stalk-a',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.018, height: 0.2, segments: 5 },
          transform: { localPos: { x: -0.28, y: 0, z: 0.1 } },
          color: 0x6f8c3a,
          biomeColor: { source: 'foliage', influence: 0.45 },
        },
      ],
    },
    {
      id: 'mound',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7 },
      parts: [
        {
          id: 'mound-a',
          shape: 'spheroid', params: { radius: 0.12 },
          transform: { localPos: { x: 0.22, y: 0, z: 0.08 }, scaleY: 0.6, scaleX: 1.4, scaleZ: 1.4 },
          color: 0xd9e7ea,
          biomeColor: { source: 'exotic', influence: 0.6 },
          biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
        },
      ],
    },
    {
      id: 'clod',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.6 },
      parts: [
        {
          id: 'clod-a',
          shape: 'cube', params: { size: 0.06 },
          transform: { localPos: { x: -0.08, y: 0, z: 0.14 } },
          color: 0xcbbf9e,
        },
      ],
    },
    {
      id: 'shard',
      weight: 0.04,
      biomeWeight: { biome_dustbleed: 0.8 },
      parts: [
        {
          id: 'shard-a',
          shape: 'dodecahedron', params: { radius: 0.06 },
          transform: { localPos: { x: 0.26, y: 0.02, z: 0.06 }, scaleY: 1.5 },
          color: 0x9ef0ea,
          biomeColor: { source: 'exotic', influence: 0.75 },
        },
      ],
    },
  ],
};
