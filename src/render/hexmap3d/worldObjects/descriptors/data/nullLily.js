/**
 * nullLily.js — Descriptor data for "Null Lily".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * nullLily.js — Descriptor data for "Null Lily".
 */
export const NULL_LILY_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'nullLily',
  kind: 'feature',
  displayName: 'Null Lily',
  scale: 1.25,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'pale-stem',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.015, height: 0.4, segments: 6 },
      color: 0xdcdcdc,
    },
    {
      id: 'void-petals',
      shape: 'cone',
      params: { bottomR: 0.15, height: 0.2, radialSegs: 6 },
      transform: { localPos: { x: 0, y: 0.35, z: 0 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 3.14159 },
      color: 0x110015,
    },
    {
      id: 'void-core',
      shape: 'sphere',
      params: { radius: 0.06 },
      transform: { localPos: { x: 0, y: 0.38, z: 0 } },
      color: 0x000000,
    },
    {
      id: 'null-halo',
      shape: 'torus',
      params: { radius: 0.16, tube: 0.008, radialSegs: 4 },
      transform: { localPos: { x: 0, y: 0.4, z: 0 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.5708 },
      color: 0xffffff,
    }
  ],
};