/**
 * snowperson.js — Descriptor data for "Snowperson".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const SNOWPERSON_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'snowperson',
  kind: 'feature',
  displayName: 'Snowperson',
  scale: 1.8,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'body',
      shape: 'lathe',
      transform: { scaleX: 0.9, scaleY: 1.05, scaleZ: 0.9 },
      color: 0xe8f2f4,
    },
    {
      id: 'coal-eye-left',
      shape: 'sphere',
      params: { radius: 0.025, wSegs: 6, hSegs: 4 },
      transform: { localPos: { x: -0.055, y: 0.53, z: 0.085 } },
      color: 0x252530,
    },
    {
      id: 'coal-eye-right',
      shape: 'sphere',
      params: { radius: 0.025, wSegs: 6, hSegs: 4 },
      transform: { localPos: { x: 0.055, y: 0.53, z: 0.085 } },
      color: 0x252530,
    },
    {
      id: 'carrot-nose',
      shape: 'cone',
      params: { bottomR: 0.045, height: 0.16, radialSegs: 6, heightSegs: 1 },
      transform: {
        localPos: { x: 0, y: 0.47, z: 0.14 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: Math.PI / 2,
      },
      color: 0xe4782d,
    },
    {
      id: 'hat',
      shape: 'cone',
      params: { bottomR: 0.15, height: 0.18, radialSegs: 7, heightSegs: 1 },
      transform: { localPos: { x: 0, y: 0.78, z: 0 } },
      color: 0x38445d,
    },
    {
      id: 'scarf',
      shape: 'torus',
      params: { radius: 0.13, tube: 0.025, radialSegs: 6, tubularSegs: 12 },
      transform: {
        localPos: { x: 0, y: 0.38, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: Math.PI / 2,
      },
      color: 0xb53f48,
    },
  ],
};
