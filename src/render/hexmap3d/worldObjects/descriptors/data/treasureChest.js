/**
 * treasureChest.js — Descriptor data for "Treasure Chest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'treasureChest',
  kind: 'feature',
  displayName: 'Treasure Chest',
  scale: 1.2,
  parts: [
    {
      id: 'chest-base',
      shape: 'box',
      params: { width: 0.35, height: 0.22, depth: 0.25 },
      color: 0x5c4033,
    },
    {
      id: 'chest-lid',
      shape: 'box',
      params: { width: 0.35, height: 0.08, depth: 0.25 },
      transform: { y: 0, lift: 0.22 },
      color: 0x4a3022,
    },
    {
      id: 'iron-strap-left',
      shape: 'box',
      params: { width: 0.03, height: 0.305, depth: 0.255 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.12, y: 0, z: 0 },
      },
      color: 0x222222,
    },
    {
      id: 'iron-strap-right',
      shape: 'box',
      params: { width: 0.03, height: 0.305, depth: 0.255 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.12, y: 0, z: 0 },
      },
      color: 0x222222,
    },
    {
      id: 'golden-lock',
      shape: 'cube',
      params: { size: 0.045 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.19, z: 0.13 },
      },
      color: 0xffd700,
    },
  ],
  emphasis: { behavior: 'dispersed' },
};
