/**
 * beachDriftwood.js — Descriptor data for "Beach Driftwood".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const BEACH_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'beach',
  kind: 'decor',
  displayName: 'Beach',
  cluster: { min: 2, max: 3 },
  placement: {
    mode: 'jitter',
    offset: 0.24,
    tiltMin: 0.05,
    tiltMax: 0.15,
    tiltSeed: 2,
  },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'driftwood-log',
      shape: 'cylinder',
      params: { bottomR: 0.06, topR: 0.04, height: 0.45, segments: 5 },
      transform: {
        y: 0.02,
        lift: -0.22,
        localAxis: { x: 1, y: 0, z: 0.2 },
        localAngle: 1.45,
      },
      color: 0xd1d5db,
    },
    {
      id: 'driftwood-snag-group',
      transform: {
        localPos: { x: 0.1, y: 0, z: 0 },
        localAxis: { x: 0, y: 1, z: 0 },
        localAngle: 0.5,
      },
      children: [
        {
          id: 'snag-branch',
          shape: 'cylinder',
          params: { bottomR: 0.04, topR: 0.015, height: 0.23, segments: 4 },
          transform: {
            localPos: { x: 0.00017707751916605776, y: -0.0030639514977661335, z: 0.0002773989557716853 },
            localAxis: { x: 0.9987646690775214, y: 0.04731046389066974, z: 0.015193939874791203 },
            localAngle: 1.5009831567151235,
          },
          color: 0x9ca3af,
        },
      ],
    },
    {
      id: 'beach-pebble-1',
      shape: 'spheroid',
      params: { radius: 0.06 },
      transform: {
        y: 0.01,
        lift: 0,
        scaleY: 0.4,
        localPos: { x: -0.16, y: 0, z: 0.12 },
      },
      color: 0x6b7280,
    },
    {
      id: 'beach-pebble-2',
      shape: 'spheroid',
      params: { radius: 0.045 },
      transform: {
        y: 0.01,
        lift: 0,
        scaleY: 0.4,
        localPos: { x: -0.22, y: 0, z: 0.08 },
      },
      color: 0x4b5563,
    },
    {
      id: 'dune-grass-sprig',
      shape: 'cone',
      params: { bottomR: 0.03, height: 0.18, radialSegs: 3 },
      transform: {
        y: 0.01,
        lift: 0,
        localPos: { x: 0.18, y: 0, z: -0.1 },
      },
      color: 0xa3b18a,
    },
  ],
};
