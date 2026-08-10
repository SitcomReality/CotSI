/**
 * desertScrub.js — Descriptor data for "Desert Scrub".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DESERT_SCRUB_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'desertScrub',
  kind: 'decor',
  displayName: 'Desert Scrub',
  scale: 1.1,
  cluster: { min: 2, max: 4 },
  placement: { mode: 'scatter', offsetMin: 0.16, offsetMax: 0.42 },
  emphasis: { behavior: 'dispersed' },
  variation: { stretchY: [0.85, 1.3], colorJitter: 0.04 },
  parts: [
    {
      id: 'cactus-stem',
      shape: 'cylinder',
      params: { bottomR: 0.065, topR: 0.065, height: 0.62 },
      color: 0x2e6f40,
      biomeColor: { source: 'primary', influence: 0.35 },
    },
    {
      id: 'left-arm-group',
      transform: { localPos: { x: -0.05, y: 0.28, z: 0 } },
      children: [
        {
          id: 'arm-base-l',
          shape: 'cylinder',
          params: { bottomR: 0.045, topR: 0.045, height: 0.16, segments: 5 },
          transform: { localAxis: { x: 0, y: 0, z: 1 }, localAngle: 1.57 },
          color: 0x2e6f40,
        },
        {
          id: 'arm-rise-l',
          shape: 'cylinder',
          params: { bottomR: 0.042, topR: 0.042, height: 0.25, segments: 5 },
          transform: { localPos: { x: -0.13, y: 0.04, z: 0 } },
          color: 0x2e6f40,
        },
      ],
    },
    {
      id: 'right-arm-group',
      transform: { localPos: { x: 0.05, y: 0.36, z: 0.02 } },
      children: [
        {
          id: 'arm-base-r',
          shape: 'cylinder',
          params: { bottomR: 0.045, topR: 0.045, height: 0.13, segments: 5 },
          transform: { localAxis: { x: 0, y: 0, z: 1 }, localAngle: -1.57 },
          color: 0x2a663b,
        },
        {
          id: 'arm-rise-r',
          shape: 'cylinder',
          params: { bottomR: 0.042, topR: 0.042, height: 0.2, segments: 5 },
          transform: { localPos: { x: 0.11, y: 0.04, z: 0 } },
          color: 0x2a663b,
        },
      ],
    },
  ],
};
