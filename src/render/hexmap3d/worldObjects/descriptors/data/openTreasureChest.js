/**
 * openTreasureChest.js — Descriptor data for "Open Treasure Chest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const OPEN_TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'openTreasureChest',
  kind: 'feature',
  displayName: 'Open Treasure Chest',
  scale: 1.2,
  parts: [
    {
      id: 'chest-base',
      shape: 'box',
      params: { width: 0.35, height: 0.15, depth: 0.25 },
      color: 0x5c4033,
    },
    {
      id: 'iron-strap-base-left',
      shape: 'box',
      params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.12, y: 0, z: 0 },
      },
      color: 0x222222,
    },
    {
      id: 'iron-strap-base-right',
      shape: 'box',
      params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.12, y: 0, z: 0 },
      },
      color: 0x222222,
    },
    {
      id: 'gold-hoard',
      shape: 'spheroid',
      params: { radius: 0.12 },
      transform: {
        y: -0.06,
        lift: 0,
        scaleX: 1.3,
        scaleY: 0.6,
        scaleZ: 0.9,
        localPos: { x: 0, y: 0.12, z: 0 },
      },
      color: 0xffd700,
    },
    {
      id: 'gem-ruby',
      shape: 'dodecahedron',
      params: { radius: 0.03 },
      transform: {
        y: -0.04,
        lift: 0,
        localPos: { x: 0.08, y: 0.16, z: 0.04 },
        localAxis: { x: 1, y: 1, z: 0 },
        localAngle: 0.5,
      },
      color: 0xe0115f,
    },
    {
      id: 'gem-sapphire',
      shape: 'dodecahedron',
      params: { radius: 0.025 },
      transform: {
        y: -0.02,
        lift: 0,
        localPos: { x: -0.05, y: 0.18, z: -0.02 },
        localAxis: { x: 0, y: 1, z: 1 },
        localAngle: 0.8,
      },
      color: 0x0f52ba,
    },
    {
      id: 'group-1',
      transform: {
        localPos: { x: 0, y: 0.15, z: 0.125 },
        localAngle: 1,
        localAxis: { x: 1, y: 0, z: 0 },
      },
      children: [
        {
          id: 'chest-lid-open',
          shape: 'box',
          params: { width: 0.35, height: 0.08, depth: 0.25 },
          transform: {
            localPos: { x: 0, y: 0, z: -0.125 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0,
          },
          color: 0x4a3022,
        },
        {
          id: 'iron-strap-lid-left',
          shape: 'box',
          params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: {
            localPos: { x: -0.1, y: 0, z: -0.125 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0,
          },
          color: 0x222222,
        },
        {
          id: 'iron-strap-lid-right',
          shape: 'box',
          params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: {
            localPos: { x: 0.1, y: 0, z: -0.125 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0,
          },
          color: 0x222222,
        },
      ],
    },
  ],
  emphasis: { behavior: 'dispersed' },
};
