/**
 * palimpsestSlab.js — Descriptor data for "Palimpsest Slab".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PALIMPSEST_SLAB_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'palimpsestSlab',
  kind: 'feature',
  displayName: 'Palimpsest Slab',
  scale: 1.5,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'slab',
      shape: 'box',
      params: { width: 0.36, height: 0.1, depth: 0.25 },
      transform: { y: 0.02, rotY: -0.15 },
      color: 0x9b8c79,
    },
    {
      id: 'old-writing',
      shape: 'box',
      params: { width: 0.2, height: 0.008, depth: 0.012 },
      transform: {
        y: 0.02,
        rotY: -0.2,
        localPos: { x: -0.03, y: 0.08, z: 0.05 },
      },
      color: 0x5c5361,
    },
    {
      id: 'new-writing',
      shape: 'box',
      params: { width: 0.16, height: 0.009, depth: 0.01 },
      transform: {
        y: 0.01,
        rotY: 0.25,
        localPos: { x: 0.04, y: 0.086, z: -0.035 },
      },
      color: 0x3d6570,
    },
  ],
};
