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
  displayName: 'Hill Mound',
  emphasis: { behavior: 'sunk' },
  parts: [
    {
      id: 'mound',
      shape: 'sphere',
      params: { radius: 0.5, wSegs: 11, hSegs: 2, thetaLength: 1.5 },
      transform: { scaleY: 0.6666666666666667 },
      color: 0xffffff,
      biomeColor: { source: 'terrain', influence: 0.8 },
      stretch: {
        x: { min: 0.9, max: 1.1, seed: 5 },
        y: { min: 0.85, max: 1.2, seed: 4 },
        z: { min: 0.9, max: 1.1, seed: 5 },
      },
    },
  ],
  placement: { mode: 'scatter', separation: 0.4 },
  cluster: { min: 2, max: 3 },
};
