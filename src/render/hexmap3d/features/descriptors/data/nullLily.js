/**
 * nullLily.js — Descriptor data for "Null Lily".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const NULL_LILY_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'nullLily',
  kind: 'feature',
  displayName: 'Null Lily',
  scale: 1.8,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'stem',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.025, height: 0.26, segments: 6 },
      color: 0x263335,
    },
    {
      id: 'petal-one',
      shape: 'spheroid',
      params: { radius: 0.13 },
      transform: {
        localPos: { x: 0.09, y: 0.27, z: 0 },
        scaleX: 0.75,
        scaleY: 0.32,
        scaleZ: 1.25,
        rotY: 0.2,
      },
      color: 0x89999a,
    },
    {
      id: 'petal-two',
      shape: 'spheroid',
      params: { radius: 0.13 },
      transform: {
        localPos: { x: -0.09, y: 0.27, z: 0 },
        scaleX: 0.75,
        scaleY: 0.32,
        scaleZ: 1.25,
        rotY: -0.2,
      },
      color: 0x718183,
    },
    {
      id: 'petal-three',
      shape: 'spheroid',
      params: { radius: 0.12 },
      transform: {
        localPos: { x: 0, y: 0.3, z: 0.09 },
        scaleX: 0.7,
        scaleY: 0.3,
        scaleZ: 1.2,
      },
      color: 0xa7b5b2,
    },
    {
      id: 'empty-center',
      shape: 'torus',
      params: { radius: 0.045, tube: 0.012, radialSegs: 5, tubularSegs: 8 },
      transform: { lift: 0.34 },
      color: 0x20282b,
    },
  ],
};
