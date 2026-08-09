/**
 * chest.js — Descriptor data for "Treasure Chest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const CHEST_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'chest',
  kind: 'feature',
  displayName: 'Treasure Chest',
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0xc8a020 },
  parts: [
    {
      id: 'body',
      shape: 'box',
      params: { width: 0.22, height: 0.12, depth: 0.15 },
    },
    {
      id: 'part-1',
      shape: 'cylinder',
      params: { bottomR: 0.1 },
      transform: { localAxis: { x: 5, y: 1, z: 2 }, localAngle: 4 },
    },
  ],
};
