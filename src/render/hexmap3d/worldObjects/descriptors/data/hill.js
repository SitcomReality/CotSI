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
      params: { radius: 0.8, wSegs: 7, thetaLength: 1.5 },
      transform: { scaleY: 0.6666666666666667 },
      color: 0x7a8f5a,
      biomeColor: { source: 'primary', influence: 0.8 },
    },
  ],
  size: { min: 0.9 },
  placement: {
    mode: 'ring',
    ringMax: 0.02,
    leanMin: 0,
    leanMax: 0,
    ringMin: 0.01,
  },
};
