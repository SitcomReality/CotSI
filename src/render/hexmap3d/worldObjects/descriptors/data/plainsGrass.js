/**
 * plainsGrass.js — Descriptor data for "Plains Grass".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLAINS_GRASS_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'plainsGrass',
  kind: 'decor',
  displayName: 'Plains Grass',
  cluster: { min: 6, max: 12 },
  size: { min: 0.85, max: 1.2 },
  placement: {
    mode: 'jitter',
    offset: 0.18,
    tiltMin: 0.06,
    tiltMax: 0.12,
    tiltSeed: 7,
  },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'blade',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.27, radialSegs: 3, heightSegs: 1 },
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
