/**
 * scoriaRose.js — Descriptor data for "Scoria Rose".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const SCORIA_ROSE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'scoriaRose',
  kind: 'feature',
  displayName: 'Scoria Rose',
  scale: 1.9,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'stony-stem',
      shape: 'cylinder',
      params: { bottomR: 0.045, topR: 0.06, height: 0.28, segments: 6 },
      color: 0x45383a,
    },
    {
      id: 'outer-petal-a',
      shape: 'cone',
      params: { bottomR: 0.13, height: 0.1, radialSegs: 6, heightSegs: 1 },
      transform: {
        lift: 0.27,
        rotY: 0,
        scaleX: 1.15,
        scaleZ: 0.65,
      },
      color: 0x8e302b,
    },
    {
      id: 'outer-petal-b',
      shape: 'cone',
      params: { bottomR: 0.12, height: 0.11, radialSegs: 6, heightSegs: 1 },
      transform: {
        lift: 0.3,
        rotY: 1.05,
        scaleX: 1.1,
        scaleZ: 0.62,
      },
      color: 0xa43c2e,
    },
    {
      id: 'outer-petal-c',
      shape: 'cone',
      params: { bottomR: 0.11, height: 0.12, radialSegs: 6, heightSegs: 1 },
      transform: {
        lift: 0.32,
        rotY: 2.1,
        scaleX: 1.05,
        scaleZ: 0.6,
      },
      color: 0x702c2c,
    },
    {
      id: 'heart',
      shape: 'dodecahedron',
      params: { radius: 0.065, detail: 0 },
      transform: { lift: 0.38 },
      color: 0xe26c32,
    },
  ],
};
