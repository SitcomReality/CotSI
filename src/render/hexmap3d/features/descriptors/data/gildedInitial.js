/**
 * gildedInitial.js — Descriptor data for "Gilded Initial".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const GILDED_INITIAL_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'gildedInitial',
  kind: 'feature',
  displayName: 'Gilded Initial',
  scale: 1.45,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'letter-stem',
      shape: 'box',
      params: { width: 0.42, height: 0.42, depth: 0.06 },
      transform: { y: 0.01 },
      color: 0x987418,
    },
    {
      id: 'letter-bowl',
      shape: 'torus',
      params: {
        radius: 0.13,
        tube: 0.035,
        radialSegs: 6,
        tubularSegs: 12,
        arc: 3.141592653589793,
      },
      transform: {
        localPos: { x: 0.035, y: 0.29, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5707963267948966,
      },
      color: 0xf0c957,
    },
    {
      id: 'gem',
      shape: 'dodecahedron',
      params: { radius: 0.05 },
      transform: {
        y: -0.21,
        scaleX: 3,
        scaleY: 2,
        localPos: { x: 0.08, y: 0.29, z: 0.05 },
      },
      color: 0x4ec2c9,
    },
  ],
};
