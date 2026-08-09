/**
 * beachDriftwood.js — Descriptor data for "Beach Driftwood".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const BEACH_DRIFTWOOD_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'beachDriftwood',
  kind: 'decor',
  displayName: 'Beach Driftwood',
  cluster: { max: 3 },
  size: { min: 0.9, max: 1.2 },
  placement: { mode: 'jitter', offset: 0.16, tiltMin: 0.02, tiltMax: 0.02 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'plank',
      shape: 'box',
      params: { width: 0.34, depth: 0.12 },
      stretch: { y: false, x: false, z: false },
      color: 0xb9a37e,
      biomeColor: { source: 'primary', influence: 0.3 },
    },
  ],
};
