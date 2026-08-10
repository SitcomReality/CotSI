/**
 * screamroot.js — Descriptor data for "Screamroot".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const SCREAMROOT_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'screamroot',
  kind: 'feature',
  displayName: 'Screamroot',
  scale: 1.1,
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'root-bulb',
      shape: 'spheroid',
      params: { radius: 0.18 },
      transform: { y: 0.05, scaleX: 0.9, scaleY: 1.3, scaleZ: 0.9 },
      color: 0x967959,
    },
    {
      id: 'tuber-leg-l',
      transform: {
        localPos: { x: -0.07, y: 0.08, z: 0.02 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 0.65,
      },
      children: [
        {
          id: 'leg-upper-l',
          shape: 'cylinder',
          params: { bottomR: 0.06, topR: 0.04, height: 0.32 },
          color: 0x806443,
        },
        {
          id: 'leg-lower-l',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.05 },
          transform: {
            localPos: { x: -0.03, y: -0.1, z: 0.03 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -0.8,
          },
          color: 0x806443,
        },
      ],
    },
    {
      id: 'tuber-leg-r',
      transform: {
        localPos: { x: 0.07, y: 0.08, z: -0.02 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: -0.65,
      },
      children: [
        {
          id: 'leg-upper-r',
          shape: 'cylinder',
          params: { bottomR: 0.06, topR: 0.03, height: 0.34 },
          color: 0x806443,
        },
        {
          id: 'leg-lower-r',
          shape: 'cylinder',
          params: { bottomR: 0.06, topR: 0.02, height: 0.38 },
          transform: {
            localPos: { x: 0.03, y: -0.1, z: -0.03 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.8,
          },
          color: 0x806443,
        },
      ],
    },
    {
      id: 'leaf-crown',
      transform: { localPos: { x: 0, y: 0.28, z: 0 } },
      children: [
        {
          id: 'leaf-center',
          shape: 'cone',
          params: { bottomR: 0.14, height: 0.43, radialSegs: 4 },
          transform: { scaleX: 0.4 },
          color: 0x8ea604,
        },
        {
          id: 'leaf-skew-1',
          shape: 'cone',
          params: { bottomR: 0.07, height: 0.37, radialSegs: 4 },
          transform: {
            localPos: { x: 0.05, y: -0.02, z: 0.05 },
            localAxis: { x: 1, y: 0, z: 1 },
            localAngle: 0.4,
          },
          color: 0xa1b80d,
        },
        {
          id: 'leaf-skew-2',
          shape: 'cone',
          params: { bottomR: 0.06, height: 0.36, radialSegs: 4 },
          transform: {
            localPos: { x: -0.06, y: -0.02, z: -0.05 },
            localAxis: { x: -1, y: 0, z: -1 },
            localAngle: 0.4,
          },
          color: 0x7c9402,
        },
      ],
    },
  ],
};
