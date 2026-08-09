/**
 * ouroborosLoop.js — Descriptor data for "Ouroboros Loop".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const OUROBOROS_LOOP_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'ouroborosLoop',
  kind: 'feature',
  displayName: 'Ouroboros Loop',
  scale: 1.45,
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'serpent-ring',
      shape: 'torus',
      params: { radius: 0.13, tube: 0.045, radialSegs: 7, tubularSegs: 16 },
      transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.5707963267948966 },
      color: 0x477448,
    },
    {
      id: 'serpent-head',
      shape: 'cone',
      params: { bottomR: 0.07, height: 0.15, heightSegs: 1 },
      transform: {
        y: -0.21,
        lift: 0.02,
        localPos: { x: 0.14, y: 0.16, z: 0 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: -0.7853981633974483,
      },
      color: 0x9141ac,
      stretch: { x: false },
    },
    {
      id: 'part-1',
      shape: 'torus',
      params: { radius: 0.13, tube: 0.05 },
      color: 0xff7800,
    },
  ],
};
