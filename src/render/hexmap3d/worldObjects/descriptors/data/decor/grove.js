/**
 * grove.js — Descriptor data for "Tree Grove".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const GROVE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'grove',
  kind: 'decor',
  displayName: 'Tree Grove',
  cluster: { rule: 'moisture' },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  // Data-driven variant pins — no hardcoded rule: denseForest groves grow the
  // conical 'tall' pines, forest the round ones (variantRule falls back to the
  // hash roll elsewhere), and Painforest always grows the gnarled variant.
  terrainVariants: { denseForest: 'tall', forest: 'round' },
  biomeVariants: { biome_painforest: 'painforest' },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'trunk',
      shape: 'cylinder',
      stretch: {
        y: { min: 0.9, max: 1.2, seed: 6 },
        x: false,
        z: false,
      },
      biomeScale: { biome_tundra: 0.85 },
      color: 0x8b5e3c,
    },
  ],
  variants: [
    {
      id: 'round',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          stretch: {
            y: { min: 1, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_tundra: 0.85 },
          color: 0x8b5e3c,
        },
        {
          id: 'canopy-round',
          shape: 'sphere',
          transform: {
            y: 0.15,
            lift: 0,
            liftRange: { min: 0.15, max: 0.3, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.3, seed: 4 },
            x: { min: 0.9, max: 1.15, seed: 5 },
            z: { min: 0.9, max: 1.15, seed: 5 },
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
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_tundra: 0.85 },
          transform: { scaleY: 0.8 },
          color: 0x8b5e3c,
        },
        {
          id: 'canopy-tall',
          shape: 'cone',
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.162, max: 0.336, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.3, seed: 4 },
            x: { min: 0.9, max: 1.15, seed: 5 },
            z: { min: 0.9, max: 1.15, seed: 5 },
          },
          color: 0x2e8b57,
          biomeColor: { source: 'accent', influence: 0.7 },
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    {
      id: 'painforest',
      parts: [
        {
          id: 'trunk-gnarled-base',
          shape: 'cylinder',
          params: { bottomR: 0.13, topR: 0.08, height: 0.3, segments: 5 },
          transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.12 },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
        },
        {
          id: 'trunk-gnarled-upper',
          shape: 'cylinder',
          params: { topR: 0.05, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.3, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -0.15,
          },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
        },
        {
          id: 'branch-gnarled',
          shape: 'cylinder',
          params: { bottomR: 0.045, topR: 0.025, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.02, y: 0.52, z: 0.03 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.7,
          },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_painforest: 0.55 },
          color: 0x8b5e3c,
        },
        {
          id: 'canopy-gnarled',
          shape: 'sphere',
          params: { radius: 0.26 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.02, y: 0.78, z: 0.21 },
          },
          color: 0x2e5d2e,
          biomeScale: { biome_painforest: 0.55 },
        },
      ],
    },
  ],
};
