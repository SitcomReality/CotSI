/**
 * plateauMound.js — Descriptor data for "Plateau Mound".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLATEAU_MOUND_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'plateauMound',
  kind: 'decor',
  displayName: 'Plateau Mound',
  emphasis: { behavior: 'sunk' },
  parts: [
    {
      id: 'mound',
      shape: 'cylinder',
      params: { bottomR: 0.75, topR: 0.42, height: 0.22, segments: 7 },
      color: 0x8a8578,
      biomeColor: { source: 'primary', influence: 0.7 },
      transform: { localAngle: -3.141592653589793, localAxis: { x: 1, y: 0, z: 0 } },
    },
  ],
};
