/**
 * features/knot.js — Descriptor data for "Knot".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const KNOT_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'knot',
  kind: 'feature',
  displayName: 'Knot',
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0xb79aff, emissiveIntensity: 0.4 },
  parts: [
    {
      id: 'knot',
      shape: 'octahedron',
      transform: { y: 0.1 },
      color: 0xc900f3,
    },
    {
      id: 'part-2',
      shape: 'box',
      params: { height: 0.25 },
      transform: { y: 0, lift: 0.18 },
      color: 0x00b4d8,
    },
  ],
};
