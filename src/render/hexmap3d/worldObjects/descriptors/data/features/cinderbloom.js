/**
 * cinderbloom.js — Descriptor data for "Cinderbloom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const CINDERBLOOM_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'cinderbloom',
  kind: 'feature',
  displayName: 'Cinderbloom',
  scale: 0.9,
  cluster: { min: 3, max: 5 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.35 },
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0xff4500, emissiveIntensity: 0.8 },
  parts: [
    {
      id: 'stalk',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.015, height: 0.35, segments: 5 },
      transform: { tiltAxis: { x: 1, z: 1 }, tilt: 0.1 },
      color: 0x2a1100,
    },
    {
      id: 'core-ember',
      shape: 'dodecahedron',
      params: { radius: 0.07 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.35, z: 0 },
      },
      color: 0xffaa00,
    },
    {
      id: 'petal-n',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.18 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.32, z: -0.06 },
        localAxis: { x: -1, y: 0, z: 0 },
        localAngle: 0.8,
      },
      color: 0xff3300,
    },
    {
      id: 'petal-s',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.18 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0, y: 0.32, z: 0.06 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.8,
      },
      color: 0xff3300,
    },
    {
      id: 'petal-e',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.18 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.06, y: 0.32, z: 0 },
        localAxis: { x: 0, y: 0, z: -1 },
        localAngle: 0.8,
      },
      color: 0xff3300,
    },
    {
      id: 'petal-w',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.18 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: -0.06, y: 0.32, z: 0 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 0.8,
      },
      color: 0xff3300,
    },
  ],
  size: { min: 0.95, max: 1.1 },
};
