/**
 * decor/denseForest.js — Descriptor data for "Dense Forest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DENSE_FOREST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'denseForest',
  kind: 'decor',
  displayName: 'Dense Forest',
  cluster: { rule: 'moisture', countsByTerrain: { denseForest: [4, 7] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  biomeVariants: {
    biome_painforest: 'painforest',
    biome_tundra: 'taigawood',
    biome_frigid_silence: 'frostwood',
    biome_scorch: 'drywood',
    biome_sere_wastes: 'deadwood',
    biome_edenfall: 'violetwood',
    biome_mourning_marsh: 'marshwood',
    biome_dustbleed: 'crystalwood',
  },
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
    {
      id: 'taigawood',
      parts: [
        {
          id: 'trunk-taiga',
          shape: 'cylinder',
          params: { topR: 0.06 },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x5c4b3e,
        },
        {
          id: 'canopy-taiga',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.42 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.25, max: 0.4, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.25, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x4a7d5a,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'frostwood',
      parts: [
        {
          id: 'trunk-frost',
          shape: 'cylinder',
          params: { topR: 0.06, height: 0.45 },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x4a3f33,
        },
        {
          id: 'canopy-frost-deep',
          shape: 'cone',
          params: { bottomR: 0.23, height: 0.46 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.28, max: 0.44, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.25, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x3a5a4a,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
        {
          id: 'snowcap-frost-deep',
          shape: 'cone',
          params: { bottomR: 0.07, height: 0.21, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.65, z: 0 },
          },
          stretch: {
            y: { min: 0.8, max: 1.1, seed: 4 },
            x: false,
            z: false,
          },
          color: 0xdfe6ec,
          biomeColor: { source: 'accent', influence: 0.6 },
        },
      ],
    },
    {
      id: 'crystalwood',
      parts: [
        {
          id: 'trunk-dustbleed',
          shape: 'cylinder',
          params: { bottomR: 0.09, topR: 0.07, height: 0.5 },
          stretch: {
            y: { min: 0.9, max: 1.25, seed: 6 },
            x: false,
            z: false,
          },
          color: 0x3d6e6c,
        },
        {
          id: 'canopy-dustbleed',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.45 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.32, max: 0.5, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.25, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x2e9e95,
          biomeColor: { source: 'accent', influence: 0.65 },
        },
        {
          id: 'crystal-dustbleed',
          shape: 'dodecahedron',
          params: { radius: 0.07 },
          transform: {
            y: 0,
            lift: 0,
            scaleY: 1.4,
            localPos: { x: 0.06, y: 0.82, z: 0.03 },
            localAxis: { x: 0, y: 1, z: 1 },
            localAngle: 0.6,
          },
          color: 0x8ce3df,
          biomeColor: { source: 'accent', influence: 0.75 },
        },
      ],
    },
    {
      id: 'drywood',
      parts: [
        {
          id: 'dry-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.085, topR: 0.055, height: 0.48 },
          stretch: { y: { min: 0.75, max: 1.2, seed: 6 } },
          color: 0x8f6b45,
          biomeColor: { source: 'terrain', influence: 0.4 },
        },
        {
          id: 'dry-canopy',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.3, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.28, max: 0.4, seed: 6 },
          },
          color: 0x7d813f,
          biomeColor: { source: 'primary', influence: 0.4 },
        },
      ],
    },
    {
      id: 'deadwood',
      parts: [
        {
          id: 'dead-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.085, topR: 0.055, height: 0.52, segments: 5 },
          color: 0x655548,
          biomeColor: { source: 'terrain', influence: 0.35 },
        },
        {
          id: 'dead-branch-a',
          shape: 'cylinder',
          params: { bottomR: 0.035, topR: 0.018, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.04, y: 0.38, z: 0 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.85,
          },
          color: 0x59483d,
        },
        {
          id: 'dead-branch-b',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.015, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.04, y: 0.52, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -1.05,
          },
          color: 0x59483d,
        },
      ],
    },
    {
      id: 'violetwood',
      parts: [
        {
          id: 'violet-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.075, topR: 0.05, height: 0.72 },
          color: 0x60434c,
        },
        {
          id: 'violet-lower-crown',
          shape: 'sphere',
          params: { radius: 0.24 },
          transform: {
            y: 0,
            lift: 0.58,
            scaleX: 1.15,
            scaleY: 0.8,
            scaleZ: 1.1,
          },
          color: 0x704d8d,
          biomeColor: { source: 'primary', influence: 0.7 },
        },
        {
          id: 'violet-upper-crown',
          shape: 'sphere',
          params: { radius: 0.18 },
          transform: {
            y: 0,
            lift: 0.88,
            scaleX: 1.1,
            scaleY: 0.75,
            scaleZ: 1.05,
          },
          color: 0x9364a8,
          biomeColor: { source: 'accent', influence: 0.45 },
        },
      ],
    },
    {
      id: 'marshwood',
      parts: [
        {
          id: 'swamp-trunk',
          shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.06, height: 0.38 },
          transform: { tiltAxis: { x: 1, z: 0.2 }, tilt: 0.2 },
          color: 0x4c4935,
        },
        {
          id: 'swamp-crown',
          shape: 'sphere',
          params: { radius: 0.26, hSegs: 3 },
          transform: {
            y: 0,
            lift: 0.35,
            scaleX: 1.35,
            scaleY: 0.55,
            scaleZ: 1.2,
          },
          color: 0x416b4d,
          biomeColor: { source: 'primary', influence: 0.65 },
        },
        {
          id: 'marsh-growth',
          shape: 'cone',
          params: { bottomR: 0.08, height: 0.13, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.12, y: 0.42, z: 0.03 },
          },
          color: 0x8a5f94,
          biomeColor: { source: 'accent', influence: 0.45 },
        },
      ],
    },
  ],
};
