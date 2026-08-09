/**
 * tree.js — Descriptor data for "Tree".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const TREE_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'tree',
  kind: 'feature',
  displayName: 'Tree',
  scale: 1.15,
  variantRule: 'solitary',
  placement: { mode: 'jitter', tiltMin: 0.02, tiltMax: 0.02 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x8b5e3c },
  parts: [
    {
      id: 'trunk',
      shape: 'cylinder',
      stretch: { y: false, x: false, z: false },
      biomeScale: { biome_tundra: 0.85 },
    },
  ],
  variants: [
    {
      id: 'round',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          stretch: { y: false, x: false, z: false },
          biomeScale: { biome_tundra: 0.85 },
        },
        {
          id: 'canopy-round',
          shape: 'sphere',
          transform: { lift: 0.2 },
          stretch: {
            y: { min: 1.1, max: 1.1, seed: 4 },
            x: { min: 1.05, max: 1.05, seed: 5 },
            z: { min: 1.05, max: 1.05, seed: 5 },
          },
          color: 0x3cb371,
          biomeColor: { source: 'primary', influence: 0.8 },
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    {
      id: 'tall',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          stretch: { y: false, x: false, z: false },
          biomeScale: { biome_tundra: 0.85 },
          transform: { scaleY: 0.8 },
        },
        {
          id: 'canopy-tall',
          shape: 'cone',
          transform: { lift: 0.22 },
          stretch: {
            y: { min: 1.1, max: 1.1, seed: 4 },
            x: { min: 1.05, max: 1.05, seed: 5 },
            z: { min: 1.05, max: 1.05, seed: 5 },
          },
          color: 0x2e8b57,
          biomeColor: { source: 'accent', influence: 0.7 },
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    {
      id: 'wide',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          stretch: { y: false, x: false, z: false },
          biomeScale: { biome_tundra: 0.85 },
        },
        {
          id: 'canopy-wide',
          shape: 'cone',
          params: { bottomR: 0.45, height: 0.3, heightSegs: 1 },
          transform: { lift: 0.3 },
          stretch: {
            y: { min: 1.1, max: 1.1, seed: 4 },
            x: { min: 1.05, max: 1.05, seed: 5 },
            z: { min: 1.05, max: 1.05, seed: 5 },
          },
          color: 0x66cdaa,
          biomeColor: { source: 'primary', influence: 0.8 },
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
  ],
};
