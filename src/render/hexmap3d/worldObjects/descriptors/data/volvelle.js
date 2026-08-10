export const VOLVELLE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'volvelle',
  kind: 'feature',
  displayName: 'Volvelle',
  scale: 1.45,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'lower-disc',
      shape: 'cylinder',
      params: { bottomR: 0.2, topR: 0.2, height: 0.035, segments: 12 },
      color: 0x927342,
    },
    {
      id: 'upper-disc',
      shape: 'cylinder',
      params: { bottomR: 0.14, topR: 0.14, height: 0.04, segments: 10 },
      transform: { lift: 0.04, rotY: 0.65 },
      color: 0xc49e58,
    },
    {
      id: 'pointer',
      shape: 'box',
      params: { width: 0.025, height: 0.018, depth: 0.28 },
      transform: { lift: 0.085, rotY: -0.35 },
      color: 0x542f38,
    },
    {
      id: 'axle',
      shape: 'dodecahedron',
      params: { radius: 0.035 },
      transform: { lift: 0.11 },
      color: 0xd7bd67,
    },
  ],
};