/**
 * decor/forest.js — Descriptor data for "Forest".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 * The terrain decor for `forest` tiles — one decor per terrain, so this is a
 * separate object from `denseForest` (deep wood). The first variant ('round')
 * is the default look; `biomeVariants` pins a dedicated look per biome —
 * the Taiga stunts Tundra's trees, the Sere Wastes grow bare dead trees,
 * Scorch dries its woodland, Edenfall purples its canopies, and so on.
 * Biome pins work through the geometry editor's Per-biome variants section.
 */
export const FOREST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'forest',
  kind: 'decor',
  displayName: 'Forest',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  biomeVariants: {
    biome_painforest: 'painforest',
    biome_tundra: 'taiga',
    biome_frigid_silence: 'frost',
    biome_scorch: 'dry',
    biome_sere_wastes: 'dead',
    biome_edenfall: 'edenfall',
    biome_mourning_marsh: 'marshwood',
    biome_dustbleed: 'dustbleed',
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
      id: 'taiga',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.07, topR: 0.05, height: 0.5 },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_tundra: 0.8 },
          color: 0x5d4a35,
        },
        {
          id: 'canopy-taiga',
          shape: 'cone',
          params: { bottomR: 0.24, height: 0.5 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.34, max: 0.5, seed: 6 },
          },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x2e6b4f,
          biomeColor: { source: 'terrain', influence: 0.55 },
          biomeScale: { biome_tundra: 0.8 },
        },
      ],
    },
    {
      id: 'frost',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.07, topR: 0.05, height: 0.45 },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_frigid_silence: 0.85 },
          color: 0x4a3f33,
        },
        {
          id: 'canopy-frost',
          shape: 'cone',
          params: { bottomR: 0.22, height: 0.42 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.3, max: 0.42, seed: 6 },
          },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 4 },
            x: { min: 0.85, max: 1.1, seed: 5 },
            z: { min: 0.85, max: 1.1, seed: 5 },
          },
          color: 0x3a5a4a,
          biomeColor: { source: 'terrain', influence: 0.5 },
          biomeScale: { biome_frigid_silence: 0.85 },
        },
        {
          id: 'snowcap',
          shape: 'cone',
          params: { bottomR: 0.1, height: 0.16, heightSegs: 1 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0, y: 0.64, z: 0 },
          },
          stretch: {
            y: { min: 0.8, max: 1.1, seed: 4 },
            x: false,
            z: false,
          },
          color: 0xdfe6ec,
          biomeColor: { source: 'accent', influence: 0.6 },
          biomeScale: { biome_frigid_silence: 0.85 },
        },
      ],
    },
    {
      id: 'dry',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.07, topR: 0.06, height: 0.3 },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_scorch: 0.8 },
          color: 0x7a5f3a,
        },
        {
          id: 'canopy-dry',
          shape: 'sphere',
          params: { radius: 0.2 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.16, max: 0.28, seed: 6 },
          },
          stretch: {
            y: { min: 0.7, max: 1, seed: 4 },
            x: { min: 0.9, max: 1.1, seed: 5 },
            z: { min: 0.9, max: 1.1, seed: 5 },
          },
          color: 0x6d7236,
          biomeColor: { source: 'terrain', influence: 0.6 },
          biomeScale: { biome_scorch: 0.8 },
        },
      ],
    },
    {
      id: 'dead',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.09, topR: 0.07, height: 0.5 },
          stretch: {
            y: { min: 0.9, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_sere_wastes: 0.8 },
          color: 0x7a6a55,
          biomeColor: { source: 'terrain', influence: 0.3 },
        },
        {
          id: 'branch-dead-a',
          shape: 'cylinder',
          params: { bottomR: 0.035, topR: 0.02, height: 0.3, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.02, y: 0.3, z: 0 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 0.9,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_sere_wastes: 0.8 },
          color: 0x6e5f4d,
        },
        {
          id: 'branch-dead-b',
          shape: 'cylinder',
          params: { bottomR: 0.03, topR: 0.018, height: 0.24, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: -0.03, y: 0.36, z: 0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: -1.05,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_sere_wastes: 0.8 },
          color: 0x6e5f4d,
        },
        {
          id: 'branch-dead-c',
          shape: 'cylinder',
          params: { bottomR: 0.025, topR: 0.015, height: 0.2, segments: 5 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.04, y: 0.44, z: -0.02 },
            localAxis: { x: 1, y: 0, z: 0 },
            localAngle: 1.25,
          },
          stretch: {
            y: { min: 0.8, max: 1.2, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_sere_wastes: 0.8 },
          color: 0x6e5f4d,
        },
      ],
    },
    {
      id: 'edenfall',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.09, topR: 0.12, height: 0.42 },
          stretch: {
            y: { min: 1, max: 1.25, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_edenfall: 1.1 },
          color: 0x4a3048,
        },
        {
          id: 'canopy-edenfall-low',
          shape: 'sphere',
          params: { radius: 0.28 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.18, max: 0.3, seed: 6 },
          },
          stretch: {
            y: { min: 0.8, max: 1.15, seed: 4 },
            x: { min: 0.95, max: 1.2, seed: 5 },
            z: { min: 0.95, max: 1.2, seed: 5 },
          },
          color: 0x7a3a9e,
          biomeColor: { source: 'primary', influence: 0.85 },
          biomeScale: { biome_edenfall: 1.1 },
        },
        {
          id: 'canopy-edenfall-high',
          shape: 'sphere',
          params: { radius: 0.16 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.04, y: 0.5, z: 0.03 },
          },
          stretch: {
            y: { min: 0.8, max: 1.15, seed: 4 },
            x: { min: 0.95, max: 1.2, seed: 5 },
            z: { min: 0.95, max: 1.2, seed: 5 },
          },
          color: 0x8c4ab8,
          biomeColor: { source: 'primary', influence: 0.8 },
          biomeScale: { biome_edenfall: 1.1 },
        },
      ],
    },
    {
      id: 'marshwood',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.09, height: 0.3 },
          stretch: {
            y: { min: 0.9, max: 1.1, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_mourning_marsh: 0.9 },
          color: 0x3a3328,
        },
        {
          id: 'canopy-marshwood',
          shape: 'sphere',
          params: { radius: 0.26 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.16, max: 0.26, seed: 6 },
          },
          stretch: {
            y: { min: 0.75, max: 1.05, seed: 4 },
            x: { min: 1, max: 1.2, seed: 5 },
            z: { min: 1, max: 1.2, seed: 5 },
          },
          color: 0x2e4a2e,
          biomeColor: { source: 'terrain', influence: 0.55 },
          biomeScale: { biome_mourning_marsh: 0.9 },
        },
      ],
    },
    {
      id: 'dustbleed',
      parts: [
        {
          id: 'trunk',
          shape: 'cylinder',
          params: { topR: 0.06, height: 0.38 },
          stretch: {
            y: { min: 0.9, max: 1.15, seed: 6 },
            x: false,
            z: false,
          },
          biomeScale: { biome_dustbleed: 0.9 },
          color: 0x3f4a3f,
        },
        {
          id: 'canopy-dustbleed',
          shape: 'sphere',
          params: { radius: 0.24 },
          transform: {
            y: 0,
            lift: 0,
            liftRange: { min: 0.2, max: 0.3, seed: 6 },
          },
          stretch: {
            y: { min: 0.85, max: 1.15, seed: 4 },
            x: { min: 0.9, max: 1.1, seed: 5 },
            z: { min: 0.9, max: 1.1, seed: 5 },
          },
          color: 0x2e6b5e,
          biomeColor: { source: 'terrain', influence: 0.5 },
          biomeScale: { biome_dustbleed: 0.9 },
        },
        {
          id: 'crystal-dustbleed',
          shape: 'dodecahedron',
          params: { radius: 0.05 },
          transform: {
            y: 0,
            lift: 0,
            localPos: { x: 0.06, y: 0.55, z: 0.04 },
            localAxis: { x: 0.6, y: 1, z: 0.3 },
            localAngle: 0.7,
          },
          color: 0x4fd0c0,
          biomeColor: { source: 'accent', influence: 0.7 },
          biomeScale: { biome_dustbleed: 0.9 },
        },
      ],
    },
  ],
};
