/**
 * forge.js -- Placeholder descriptor data for "Forge".
 *
 * Hand-authored stand-in (the goal explicitly defers geometry work): a simple
 * anvil silhouette — stone base, dark anvil body, horn block. Replace via the
 * geometry editor in a later pass.
 */
export const FORGE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'forge',
  kind: 'feature',
  displayName: 'Forge',
  scale: 1.1,
  placement: { mode: 'center' },
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
      transform: { y: 0.3, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 },
      color: 0x343a40,
    },
    {
      id: 'coals',
      shape: 'octahedron',
      params: { radius: 0.07 },
      transform: { localPos: { x: -0.18, y: 0.14, z: 0.14 } },
      color: 0xff6b35,
    },
  ],
};
