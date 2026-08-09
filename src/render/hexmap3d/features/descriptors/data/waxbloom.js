/**
 * waxbloom.js — Descriptor data for "Waxbloom".
 */
export const WAXBLOOM_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'waxbloom',
  kind: 'feature',
  displayName: 'Waxbloom',
  scale: 1.0,
  cluster: { rule: 'uniform', min: 1, max: 2 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.2 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'wax-stem',
      shape: 'cylinder',
      params: { bottomR: 0.04, topR: 0.035, height: 0.35, segments: 6 },
      color: 0xfdf5e6,
    },
    {
      id: 'petal-drape-1',
      shape: 'cone',
      params: { bottomR: 0.06, height: 0.2 },
      transform: { localPos: { x: -0.03, y: 0.3, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: 2.5 },
      color: 0xfffaf0,
    },
    {
      id: 'petal-drape-2',
      shape: 'cone',
      params: { bottomR: 0.06, height: 0.2 },
      transform: { localPos: { x: 0.03, y: 0.3, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -2.5 },
      color: 0xfffaf0,
    },
    {
      id: 'petal-drape-3',
      shape: 'cone',
      params: { bottomR: 0.06, height: 0.2 },
      transform: { localPos: { x: 0, y: 0.3, z: 0.03 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 2.5 },
      color: 0xfffaf0,
    },
    {
      id: 'core-flame',
      shape: 'dodecahedron',
      params: { radius: 0.04 },
      transform: { localPos: { x: 0, y: 0.36, z: 0 } },
      color: 0xffd700,
    }
  ],
};