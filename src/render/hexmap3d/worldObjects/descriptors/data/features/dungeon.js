/**
 * dungeon.js — Descriptor data for "Dungeon Entrance".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * The map feature `feature_dungeon` (kind 'dungeon') resolves to this
 * descriptor via the generic descriptorById path in gameBuilder.js.
 */
export const DUNGEON_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'dungeon',
  kind: 'feature',
  displayName: 'Dungeon Entrance',
  scale: 1.4,
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'pillar-left',
      shape: 'box',
      params: { width: 0.1, height: 0.6, depth: 0.22 },
      transform: { localPos: { x: -0.13, y: 0, z: 0 } },
      color: 0x4a4a57,
    },
    {
      id: 'pillar-right',
      shape: 'box',
      params: { width: 0.1, height: 0.6, depth: 0.22 },
      transform: { localPos: { x: 0.13, y: 0, z: 0 } },
      color: 0x4a4a57,
    },
    {
      id: 'lintel',
      shape: 'box',
      params: { width: 0.38, height: 0.12, depth: 0.24 },
      transform: { lift: 0.6 },
      color: 0x4a4a57,
    },
    {
      id: 'portal',
      shape: 'box',
      params: { width: 0.26, height: 0.42, depth: 0.04 },
      transform: { lift: 0.08, localPos: { x: 0, y: 0, z: 0.1 } },
      color: 0x0d0d16,
    },
    {
      id: 'step-top',
      shape: 'box',
      params: { width: 0.26, height: 0.06, depth: 0.1 },
      transform: { lift: 0.04, localPos: { x: 0, y: 0, z: 0.24 } },
      color: 0x3a3a46,
    },
    {
      id: 'step-mid',
      shape: 'box',
      params: { width: 0.32, height: 0.06, depth: 0.1 },
      transform: { localPos: { x: 0, y: 0, z: 0.36 } },
      color: 0x33333f,
    },
  ],
};
