/**
 * titanflesh.js — Descriptor data for "Titanflesh".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * Placeholder decor for the Titanstain biome's land terrains — fleshy lumps
 * and veins that will be redesigned into proper crazy geometry.
 */
export const TITANFLESH_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'titanflesh',
  kind: 'decor',
  displayName: 'Titanflesh',
  cluster: { min: 2, max: 3 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.4, separation: 0.4 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'flesh-lump',
      shape: 'sphere',
      params: { radius: 0.08 },
      color: 0xe8b0c0,
      biomeColor: { source: 'terrain', influence: 0.7 },
    },
    {
      id: 'flesh-vein',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.02, height: 0.22, segments: 5 },
      transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.57 },
      color: 0xa02050,
      biomeColor: { source: 'accent', influence: 0.6 },
    },
  ],
};
