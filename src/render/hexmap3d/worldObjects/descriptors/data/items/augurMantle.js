/**
 * augurMantle.js — Descriptor data for "Augur's Mantle" (armor item).
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const AUGUR_MANTLE_DESCRIPTOR = {
  id: 'augurMantle',
  kind: 'item',
  slot: 'armor',
  displayName: "Augur's Mantle",
  parts: [
    { id: 'mantle', shape: 'box', params: { width: 0.4, height: 0.02, depth: 0.3 }, transform: { y: 0.34 }, color: 0x3a4a5a },
    { id: 'collar', shape: 'torus', params: { radius: 0.12, tube: 0.03 }, transform: { localPos: { x: 0, y: 0.36, z: 0 } }, color: 0x8ab8f0 },
  ],
};
