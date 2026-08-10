/**
 * waterDecor.js -- Descriptor data for "Water Decor".
 * Not used yet.
 */
export const WATER_DECOR_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'waterDecor',
  kind: 'decor',
  displayName: 'Water Surface',
  scale: 1.0,
  cluster: { rule: 'uniform', min: 2, max: 4 },
  placement: { mode: 'jitter', offset: 0.28 },
  emphasis: { behavior: 'sunk' },
  variantRule: 'hash',
  parts: [
    {
      id: 'water-ripple-ring',
      shape: 'torus',
      params: { radius: 0.14, tube: 0.015, tubularSegs: 8 },
      transform: { y: 0.01, scaleY: 0.2 },
      color: 0xa2d2ff,
    },
  ],
  variants: [
    {
      id: 'lilyPad',
      parts: [
        {
          id: 'lily-pad-leaf',
          shape: 'spheroid',
          params: { radius: 0.14, wSegs: 6, hSegs: 4 },
          transform: { y: 0.01, scaleY: 0.08 },
          color: 0x2d6a4f,
        },
        {
          id: 'lotus-bud',
          shape: 'dodecahedron',
          params: { radius: 0.035 },
          transform: { y: 0.02, localPos: { x: 0.02, y: 0.02, z: 0.02 } },
          color: 0xffc8dd,
        },
      ],
    },
    {
      id: 'seafoam',
      parts: [
        {
          id: 'foam-ring',
          shape: 'torus',
          params: { radius: 0.16, tube: 0.018, tubularSegs: 8 },
          transform: { y: 0.01, scaleY: 0.15 },
          color: 0xe0f2fe,
        },
        {
          id: 'foam-mote',
          shape: 'spheroid',
          params: { radius: 0.04 },
          transform: { y: 0.01, scaleY: 0.2, localPos: { x: 0.08, y: 0, z: 0.05 } },
          color: 0xf0f9ff,
        },
      ],
    },
    {
      id: 'kelpFrond',
      parts: [
        {
          id: 'kelp-leaf',
          shape: 'cylinder',
          params: { bottomR: 0.025, topR: 0.01, height: 0.35, segments: 5 },
          transform: { y: 0.01, localAxis: { x: 1, y: 0, z: 0.3 }, localAngle: 1.48 },
          color: 0x1b4332,
        },
      ],
    },
  ],
};