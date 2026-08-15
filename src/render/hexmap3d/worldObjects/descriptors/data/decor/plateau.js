/**
 * plateauMound.js — Descriptor data for "Plateau Mound".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLATEAU_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'plateau',
  kind: 'decor',
  displayName: 'Plateau',
  emphasis: { behavior: 'sunk' },
  parts: [
    {
      id: 'mound',
      shape: 'cylinder',
      params: { bottomR: 0.75, topR: 0.5, segments: 10 },
      color: 0xffffff,
      biomeColor: { source: 'terrain', influence: 0.8 },
      transform: { localAngle: -3.141592653589793, localAxis: { x: 1, y: 0, z: 0 } },
      stretch: { y: { min: 0.8, max: 1, seed: 4 } },
    },
  ],
};
