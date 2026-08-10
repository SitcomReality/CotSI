/**
 * scoriaRose.js — Descriptor data for "Scoria Rose".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const SCORIA_ROSE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'scoriaRose',
  kind: 'feature',
  displayName: 'Scoria Rose',
  placement: { mode: 'scatter', offsetMin: 0 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'base-rock-1',
      shape: 'octahedron',
      params: { radius: 0.25 },
      transform: { scaleY: 0.5 },
      color: 0x222222,
    },
    {
      id: 'base-rock-2',
      shape: 'octahedron',
      transform: {
        y: 0,
        lift: 0,
        scaleY: 0.6,
        localAxis: { x: 0, y: 1, z: 0 },
        localAngle: 0.785,
      },
      color: 0x1a1a1a,
    },
    {
      id: 'outer-bloom',
      shape: 'dodecahedron',
      params: { radius: 0.14 },
      transform: { y: 0, lift: 0.12 },
      color: 0x8b0000,
      biomeColor: { source: 'primary', influence: 0.3 },
    },
    {
      id: 'inner-bloom',
      shape: 'octahedron',
      params: { radius: 0.09 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.22, z: 0 },
        localAxis: { x: 0, y: 1, z: 0 },
        localAngle: 0.4,
      },
      color: 0xdc143c,
    },
  ],
  cluster: { min: 2, max: 3 },
  size: { min: 0.92, max: 1.13 },
};
