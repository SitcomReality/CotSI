/**
 * treasureChest.js — Descriptor data for "Treasure Chest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'treasureChest',
  kind: 'feature',
  displayName: 'Treasure Chest',
  scale: 1.35,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'chest-body',
      shape: 'box',
      params: { width: 0.34, height: 0.22, depth: 0.25 },
      color: 0x75452b,
    },
    {
      id: 'lid',
      shape: 'box',
      params: { width: 0.36, height: 0.08, depth: 0.27 },
      transform: { lift: 0.22, scaleX: 1, scaleY: 1, scaleZ: 1 },
      color: 0x8e5730,
    },
    {
      id: 'front-band',
      shape: 'box',
      params: { width: 0.035, height: 0.25, depth: 0.27 },
      transform: { localPos: { x: 0.1, y: 0.12, z: 0 } },
      color: 0xc49a48,
    },
    {
      id: 'side-band',
      shape: 'box',
      params: { width: 0.36, height: 0.035, depth: 0.025 },
      transform: { localPos: { x: 0, y: 0.12, z: 0.13 } },
      color: 0xc49a48,
    },
    {
      id: 'lock',
      shape: 'box',
      params: { width: 0.07, height: 0.08, depth: 0.025 },
      transform: { localPos: { x: 0, y: 0.12, z: 0.145 } },
      color: 0xe0b95d,
    },
  ],
};
