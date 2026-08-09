/**
 * desertScrub.js — Descriptor data for "Desert Scrub".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DESERT_SCRUB_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'desertScrub',
  kind: 'decor',
  displayName: 'Desert Scrub',
  cluster: { min: 2, max: 4 },
  size: { min: 0.9, max: 1.15 },
  placement: { mode: 'jitter', offset: 0.15, tiltMin: 0.02, tiltMax: 0.02 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'scrub',
      shape: 'spheroid',
      params: { radius: 0.12 },
      transform: { scaleY: 0.8 },
      color: 0x7a6b3f,
      biomeColor: { source: 'primary', influence: 0.5 },
    },
  ],
};
