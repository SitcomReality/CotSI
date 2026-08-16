/**
 * decor/beach.js — Descriptor data for "Beach decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const BEACH_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'beach',
  kind: 'decor',
  displayName: 'Beach decor',
  cluster: { min: 5, max: 8, rule: 'uniform' },
  size: { min: 0.85, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.38, separation: 0.34 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.5,
  motifs: [
    {
      id: 'tuft',
      weight: 0.3,
      parts: [
        {
          id: 'tuft-a',
          shape: 'cone', params: { bottomR: 0.2, height: 0.22, radialSegs: 6, heightSegs: 1 },
          transform: { scaleY: 0.8, scaleX: 1.6, scaleZ: 1.6 },
          color: 0xc2b06a,
          biomeColor: { source: 'primary', influence: 0.45 },
        },
      ],
    },
    {
      id: 'driftwood',
      weight: 0.25,
      parts: [
        {
          id: 'driftwood-log',
          shape: 'cylinder', params: { bottomR: 0.05, topR: 0.03, height: 0.4, segments: 5 },
          transform: { localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
          stretch: { y: { min: 0.85, max: 1.25, seed: 6 }, x: false, z: false },
          color: 0x9d8a68,
          biomeColor: { source: 'terrain', influence: 0.4 },
        },
      ],
    },
    {
      id: 'stone',
      weight: 0.2,
      parts: [
        {
          id: 'stone-a',
          shape: 'dodecahedron', params: { radius: 0.12 },
          transform: { scaleY: 0.75, scaleX: 1.2, scaleZ: 1.1 },
          color: 0x8f9aa0,
          biomeColor: { source: 'terrain', influence: 0.4 },
        },
      ],
    },
    {
      id: 'shell',
      weight: 0.15,
      parts: [
        {
          id: 'shell-a',
          shape: 'spheroid', params: { radius: 0.08 },
          transform: { localPos: { x: -0.1, y: 0, z: -0.12 }, scaleY: 0.55, scaleX: 1.3, scaleZ: 1, localAngle: 0.5 },
          color: 0xe2d4c3,
          biomeColor: { source: 'accent', influence: 0.5 },
        },
      ],
    },
    {
      id: 'glass',
      weight: 0.08,
      biomeWeight: { biome_edenfall: 1.5, biome_dustbleed: 1.5 },
      parts: [
        {
          id: 'glass-shard',
          shape: 'dodecahedron', params: { radius: 0.07 },
          transform: { scaleY: 1.4, scaleX: 0.7, scaleZ: 0.7, localAngle: 0.5 },
          color: 0xc994ee,
          biomeColor: { source: 'accent', influence: 0.7 },
        },
      ],
    },
    {
      id: 'bone',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.8 },
      parts: [
        {
          id: 'bone-rib',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.015, height: 0.26, segments: 5 },
          transform: { localPos: { x: -0.08, y: 0, z: 0.12 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.85 },
          color: 0xefe7d2,
          biomeColor: { source: 'terrain', influence: 0.6 },
        },
      ],
    },
    {
      id: 'wrack',
      weight: 0.04,
      biomeWeight: { biome_mourning_marsh: 0.8 },
      parts: [
        {
          id: 'wrack-mound',
          shape: 'spheroid', params: { radius: 0.12 },
          transform: { localPos: { x: 0.2, y: 0, z: 0.04 }, scaleY: 0.45, scaleX: 1.4, scaleZ: 1.4 },
          color: 0x3d594d,
          biomeColor: { source: 'primary', influence: 0.55 },
        },
      ],
    },
  ],
};
