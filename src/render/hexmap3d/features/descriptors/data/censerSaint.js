/**
 * censerSaint.js — Descriptor data for "Censer Saint".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const CENSER_SAINT_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'censerSaint',
  kind: 'feature',
  displayName: 'Censer Saint',
  scale: 1.7,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'base',
      shape: 'cylinder',
      params: { bottomR: 0.16, topR: 0.12, height: 0.14, segments: 8 },
      color: 0x6f596f,
    },
    {
      id: 'robe',
      shape: 'cone',
      params: { bottomR: 0.2, height: 0.34, radialSegs: 8, heightSegs: 2 },
      transform: { lift: 0.12 },
      color: 0x51405f,
    },
    {
      id: 'head',
      shape: 'sphere',
      params: { radius: 0.105, wSegs: 8, hSegs: 5 },
      transform: { lift: 0.47 },
      color: 0xd6b6a7,
    },
    {
      id: 'halo',
      shape: 'torus',
      params: { radius: 0.13, tube: 0.018, radialSegs: 6, tubularSegs: 12 },
      transform: {
        localPos: { x: 0, y: 0.56, z: -0.025 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: Math.PI / 2,
      },
      color: 0xd9a83f,
    },
    {
      id: 'censer',
      shape: 'sphere',
      params: { radius: 0.075, wSegs: 8, hSegs: 5 },
      transform: { localPos: { x: 0.17, y: 0.25, z: 0 } },
      color: 0xa67c52,
    },
    {
      id: 'smoke',
      shape: 'spheroid',
      params: { radius: 0.045, wSegs: 6, hSegs: 4 },
      transform: { localPos: { x: 0.17, y: 0.39, z: 0 } },
      color: 0xd8d0d8,
    },
  ],
};
