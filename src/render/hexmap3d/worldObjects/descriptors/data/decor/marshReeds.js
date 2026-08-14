/**
 * marshReeds.js — Descriptor data for "Marsh Reeds".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const MARSH_REEDS_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'marshReeds',
  kind: 'decor',
  displayName: 'Marsh Reeds',
  cluster: { min: 4, max: 7 },
  size: { max: 1.25 },
  placement: { mode: 'jitter', offset: 0.12, tiltMin: 0.04, tiltMax: 0.16 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'reed',
      shape: 'cone',
      params: { bottomR: 0.028, height: 0.55, radialSegs: 4 },
      stretch: {
        y: { min: 0.85, max: 1.3, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x3f5a2e,
      biomeColor: { source: 'primary', influence: 0.6 },
    },
  ],
};
