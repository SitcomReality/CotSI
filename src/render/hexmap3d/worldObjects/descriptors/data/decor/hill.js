/**
 * hill.js — Descriptor data for "Hill Mound".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const HILL_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'hill',
  kind: 'decor',
  displayName: 'Hill decor',
  emphasis: { behavior: 'sunk' },
  parts: [
    {
      id: 'mound',
      shape: 'sphere',
      params: { radius: 0.8, wSegs: 10, thetaLength: 1.4 },
      transform: {
        scaleY: 0.6666666666666667,
        localAngle: 1.5707963267948966,
        localAxis: { x: 0, y: 1, z: 0 },
      },
      color: 0xffffff,
      biomeColor: { source: 'terrain', influence: 0.8 },
      stretch: {
        y: { min: 1, max: 1.25, seed: 4 },
        x: { min: 0.9, max: 1.1, seed: 5 },
        z: { min: 0.9, max: 1.1, seed: 5 },
      },
    },
  ],
  placement: { mode: 'jitter', offset: 0.01 },
};
