/**
 * censerSaint.js — Descriptor data for "Censer Saint".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * censerSaint.js — Descriptor data for "Censer Saint".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const CENSER_SAINT_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'censerSaint',
  kind: 'feature',
  displayName: 'Censer Saint',
  scale: 1.4,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'pedestal',
      shape: 'cylinder',
      params: { bottomR: 0.35, topR: 0.3, height: 0.15, segments: 8 },
      color: 0x555555,
    },
    {
      id: 'robe-body',
      shape: 'cone',
      params: { bottomR: 0.25, height: 0.8, radialSegs: 8 },
      transform: { lift: 0.15 },
      color: 0x6b7075,
    },
    {
      id: 'head',
      shape: 'sphere',
      params: { radius: 0.12 },
      transform: { localPos: { x: 0, y: 0.95, z: 0 } },
      color: 0x9ca3af,
    },
    {
      id: 'halo',
      shape: 'torus',
      params: { radius: 0.18, tube: 0.02, radialSegs: 4, tubularSegs: 16 },
      transform: { 
        localPos: { x: 0, y: 1.05, z: -0.05 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5708
      },
      color: 0xffd700,
    },
    {
      id: 'censer-chain',
      shape: 'cylinder',
      params: { bottomR: 0.005, topR: 0.005, height: 0.35 },
      transform: { localPos: { x: 0.22, y: 0.4, z: 0.15 } },
      color: 0xaaaaaa,
    },
    {
      id: 'censer',
      shape: 'dodecahedron',
      params: { radius: 0.06 },
      transform: { localPos: { x: 0.22, y: 0.34, z: 0.15 } },
      color: 0xb87333,
    }
  ],
};