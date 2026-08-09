/**
 * foolsFire.js — Descriptor data for "Fool's Fire".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const FOOLS_FIRE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'foolsFire',
  kind: 'feature',
  displayName: 'Fool\'s Fire',
  scale: 1.7,
  placement: { mode: 'jitter', offset: 0.06 },
  emphasis: { behavior: 'dispersed' },
  variation: { colorJitter: 0.08 },
  material: { emissive: 0xff5a1f, emissiveIntensity: 0.35 },
  parts: [
    {
      id: 'blue-flame',
      shape: 'cone',
      params: { bottomR: 0.14, height: 0.34, radialSegs: 7, heightSegs: 2 },
      color: 0x438dff,
    },
    {
      id: 'inner-flame',
      shape: 'cone',
      params: { bottomR: 0.08, height: 0.23, radialSegs: 6, heightSegs: 1 },
      transform: { lift: 0.05 },
      color: 0xffd34d,
    },
    {
      id: 'wick',
      shape: 'cylinder',
      params: { bottomR: 0.025, topR: 0.018, height: 0.12, segments: 5 },
      transform: { lift: -0.02 },
      color: 0x33272c,
    },
    {
      id: 'spark',
      shape: 'dodecahedron',
      params: { radius: 0.025, detail: 0 },
      transform: { localPos: { x: 0.09, y: 0.38, z: 0.02 } },
      color: 0xffa62f,
    },
  ],
};
