/**
 * features/forge.js — Descriptor data for "Forge".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const FORGE_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'forge',
  kind: 'feature',
  displayName: 'Forge',
  scale: 1.1,
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0xff8c42, emissiveIntensity: 0.15 },
  parts: [
    {
      id: 'forge-hearth',
      shape: 'box',
      params: { width: 0.4, height: 0.12, depth: 0.4 },
      color: 0x495057,
    },
    {
      id: 'anvil-body',
      shape: 'box',
      params: { width: 0.3, height: 0.18, depth: 0.14 },
      transform: { y: 0.12, localPos: { x: 0, y: 0, z: 0 } },
      color: 0x212529,
    },
    {
      id: 'anvil-top',
      shape: 'cylinder',
      params: { bottomR: 0.05, topR: 0.05, height: 0.22, segments: 8 },
      transform: {
        y: 0.3,
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5707963267948966,
        localPos: { x: 0, y: -0.08, z: 0.08 },
      },
      color: 0x343a40,
    },
    {
      id: 'coals',
      shape: 'octahedron',
      params: { radius: 0.07 },
      transform: { localPos: { x: -0.0032438602043435593, y: 0.047033401222114614, z: 0.1272131759706159 } },
      color: 0xff6b35,
    },
  ],
};
