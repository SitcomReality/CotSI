/**
 * plateauMound.js — Descriptor data for "Plateau Mound".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLATEAU_MOUND_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'plateauMound',
  kind: 'decor',
  displayName: 'Plateau Mound',
  emphasis: { behavior: 'sunk' },
  parts: [
    {
      id: 'mound',
      shape: 'cylinder',
      params: { bottomR: 0.42, topR: 0.3, height: 0.22 },
      color: 0x8a8578,
      biomeColor: { source: 'primary', influence: 0.3 },
    },
  ],
};
