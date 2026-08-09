/**
 * scoriaRose.js — Descriptor data for "Scoria Rose".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * scoriaRose.js — Descriptor data for "Scoria Rose".
 */
export const SCORIA_ROSE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'scoriaRose',
  kind: 'feature',
  displayName: 'Scoria Rose',
  scale: 1.0,
  placement: { mode: 'scatter' },
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
      params: { radius: 0.2 },
      transform: { localAxis: { x: 0, y: 1, z: 0 }, localAngle: 0.785, scaleY: 0.6 },
      color: 0x1a1a1a,
    },
    {
      id: 'outer-bloom',
      shape: 'dodecahedron',
      params: { radius: 0.14 },
      transform: { lift: 0.12 },
      color: 0x8b0000,
      biomeColor: { source: 'primary', influence: 0.3 },
    },
    {
      id: 'inner-bloom',
      shape: 'octahedron',
      params: { radius: 0.09 },
      transform: { localPos: { x: 0, y: 0.22, z: 0 }, localAxis: { x: 0, y: 1, z: 0 }, localAngle: 0.4 },
      color: 0xdc143c,
    }
  ],
};