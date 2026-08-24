/**
 * dustbleedCrystal.js — Descriptor data for "Dustbleed Crystal".
 *
 * Placeholder geometry: a small cluster of turquoise shards. Edit this object
 * in the geometry editor (dev/tools/geometryEditor.html) and press Save —
 * hand edits are overwritten.
 */
export const DUSTBLEED_CRYSTAL_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'dustbleedCrystal',
  kind: 'feature',
  displayName: 'Dustbleed Crystal',
  scale: 1.2,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'shard-tall',
      shape: 'octahedron',
      params: { radius: 0.16 },
      transform: { y: 0.18, scaleY: 1.6 },
      color: 0x2ec4b6,
    },
    {
      id: 'shard-left',
      shape: 'octahedron',
      params: { radius: 0.11 },
      transform: {
        localPos: { x: -0.14, y: 0.1, z: 0.04 },
        localAxis: { x: -1, y: 0, z: 0.3 },
        localAngle: 0.5,
        scaleY: 1.4,
      },
      color: 0x35d4c2,
    },
    {
      id: 'shard-right',
      shape: 'octahedron',
      params: { radius: 0.09 },
      transform: {
        localPos: { x: 0.12, y: 0.08, z: -0.05 },
        localAxis: { x: 1, y: 0, z: -0.3 },
        localAngle: 0.55,
        scaleY: 1.5,
      },
      color: 0x27a99c,
    },
  ],
};
