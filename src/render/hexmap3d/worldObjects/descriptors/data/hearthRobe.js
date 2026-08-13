/**
 * hearthRobe.js — Descriptor data for "Hearth Robe" (armor item).
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const HEARTH_ROBE_DESCRIPTOR = {
  id: 'hearthRobe',
  kind: 'item',
  slot: 'armor',
  displayName: 'Hearth Robe',
  parts: [
    { id: 'body', shape: 'cone', params: { bottomR: 0.22, height: 0.42, radialSegs: 6 }, color: 0x9a4a3a },
    { id: 'collar', shape: 'torus', params: { radius: 0.1, tube: 0.03 }, transform: { localPos: { x: 0, y: 0.4, z: 0 } }, color: 0xefc86b },
  ],
};
