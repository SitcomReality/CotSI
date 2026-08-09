/**
 * foolsFire.js — Descriptor data for "Fool's Fire".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * foolsFire.js — Descriptor data for "Fool's Fire".
 */
export const FOOLS_FIRE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'foolsFire',
  kind: 'feature',
  displayName: "Fool's Fire",
  scale: 1.2,
  cluster: { rule: 'uniform', min: 1, max: 3 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.4 },
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0x00ffcc, emissiveIntensity: 1.5 },
  parts: [
    {
      id: 'core-wisp',
      shape: 'dodecahedron',
      params: { radius: 0.08 },
      transform: { lift: 0.6 },
      color: 0x00ffcc,
    },
    {
      id: 'satellite-1',
      shape: 'octahedron',
      params: { radius: 0.03 },
      transform: { localPos: { x: 0.12, y: 0.75, z: 0.05 }, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.5 },
      color: 0x00e6b8,
    },
    {
      id: 'satellite-2',
      shape: 'octahedron',
      params: { radius: 0.025 },
      transform: { localPos: { x: -0.1, y: 0.5, z: 0.1 }, localAxis: { x: 0, y: 1, z: 1 }, localAngle: 0.8 },
      color: 0x00ccaa,
    },
    {
      id: 'satellite-3',
      shape: 'octahedron',
      params: { radius: 0.02 },
      transform: { localPos: { x: 0.05, y: 0.65, z: -0.12 } },
      color: 0x00ffff,
    }
  ],
};