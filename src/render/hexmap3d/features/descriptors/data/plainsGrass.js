/**
 * plainsGrass.js — Descriptor data for "Plains Grass".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLAINS_GRASS_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'plainsGrass',
  kind: 'decor',
  displayName: 'Plains Grass',
  cluster: { min: 3, max: 6 },
  size: { min: 0.9, max: 1.15 },
  placement: { mode: 'jitter', offset: 0.14, tiltMin: 0.06, tiltMax: 0.18 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'blade',
      shape: 'cone',
      params: { bottomR: 0.02, height: 0.18, radialSegs: 3, heightSegs: 1 },
      stretch: {
        y: { min: 0.8, max: 1.4, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x4e7d33,
      biomeColor: { source: 'primary', influence: 0.5 },
    },
  ],
};
