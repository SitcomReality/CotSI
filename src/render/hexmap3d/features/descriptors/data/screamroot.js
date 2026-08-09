export const SCREAMROOT_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'screamroot',
  kind: 'feature',
  displayName: 'Screamroot',
  scale: 1.7,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'root-body',
      shape: 'cylinder',
      params: { bottomR: 0.12, topR: 0.07, height: 0.4, segments: 6 },
      transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.18 },
      color: 0x654033,
    },
    {
      id: 'root-mouth',
      shape: 'torus',
      params: { radius: 0.08, tube: 0.018, radialSegs: 6, tubularSegs: 12 },
      transform: {
        localPos: { x: 0, y: 0.25, z: 0.065 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: Math.PI / 2,
      },
      color: 0x291f25,
    },
    {
      id: 'root-tendril',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.015, height: 0.3, segments: 5 },
      transform: {
        localPos: { x: 0.13, y: 0.05, z: 0 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 0.7,
      },
      color: 0x57372e,
    },
  ],
};