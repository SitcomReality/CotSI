/**
 * decor/desert.js — Descriptor data for "Desert Growth".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DESERT_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'desert',
  kind: 'decor',
  displayName: 'Desert Growth',
  cluster: { min: 6, max: 8, rule: 'uniform' },
  size: { min: 0.9, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.45, separation: 0.42 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      id: 'cactus',
      weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1 },
      parts: [
        {
          id: 'cactus-trunk',
          shape: 'cylinder', params: { bottomR: 0.1, topR: 0.085, height: 0.55, segments: 6 },
          stretch: { y: { min: 0.9, max: 1.25, seed: 6 }, x: false, z: false },
          color: 0x4c8a4a,
          biomeColor: { source: 'primary', influence: 0.45 },
          biomeScale: { biome_edenfall: 1.1, biome_dustbleed: 1.05 },
        },
        {
          id: 'cactus-arms', seed: 101, default: 'two-straight',
          alternatives: [
            { id: 'none', weight: 0.25, parts: [] },
            {
              id: 'one-straight', weight: 0.3,
              parts: [
                {
                  id: 'arm-one-a',
                  shape: 'cylinder', params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 },
                  transform: { localPos: { x: 0.12, y: 0.22, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
                  color: 0x4c8a4a,
                  biomeColor: { source: 'primary', influence: 0.45 },
                },
              ],
            },
            {
              id: 'two-straight', weight: 0.3,
              parts: [
                {
                  id: 'arm-two-a',
                  shape: 'cylinder', params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 },
                  transform: { localPos: { x: 0.12, y: 0.22, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
                  color: 0x4c8a4a,
                  biomeColor: { source: 'primary', influence: 0.45 },
                },
                {
                  id: 'arm-two-b',
                  shape: 'cylinder', params: { bottomR: 0.035, topR: 0.025, height: 0.16, segments: 5 },
                  transform: { localPos: { x: -0.12, y: 0.26, z: 0.01 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: 0.85 },
                  color: 0x4c8a4a,
                  biomeColor: { source: 'primary', influence: 0.45 },
                },
              ],
            },
            {
              id: 'elbow', weight: 0.15,
              parts: [
                // Hinged arm — the hinge lives OUTSIDE the choice point, in a
                // group (the choice point cannot carry a transform), so the
                // base + rise share one localPos/localAngle (the commented-out
                // "better cactus" in the pre-v6 file).
                {
                  id: 'elbow-hinge',
                  transform: { localPos: { x: 0.12, y: 0.22, z: 0 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
                  children: [
                    {
                      id: 'elbow-base',
                      shape: 'cylinder', params: { bottomR: 0.045, topR: 0.045, height: 0.16, segments: 5 },
                      transform: { localAxis: { x: 0, y: 0, z: 1 }, localAngle: 1.57 },
                      color: 0x4c8a4a,
                    },
                    {
                      id: 'elbow-rise',
                      shape: 'cylinder', params: { bottomR: 0.042, topR: 0.042, height: 0.25, segments: 5 },
                      transform: { localPos: { x: -0.13, y: 0.04, z: 0 } },
                      color: 0x4c8a4a,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'rock',
      weight: 0.45,
      parts: [
        {
          id: 'rock-a',
          shape: 'dodecahedron', params: { radius: 0.13 },
          transform: { scaleY: 0.7, scaleX: 1.2, scaleZ: 1.1 },
          color: 0xc49a6c,
          biomeColor: { source: 'terrain', influence: 0.45 },
        },
      ],
    },
    {
      id: 'shrub',
      weight: 0.2,
      parts: [
        {
          id: 'shrub-a',
          shape: 'cone', params: { bottomR: 0.16, height: 0.18, radialSegs: 6, heightSegs: 1 },
          transform: { scaleY: 0.7, scaleX: 1.5, scaleZ: 1.5 },
          color: 0x9a8845,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'cold-mound',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7 },
      parts: [
        {
          id: 'cold-mound-a',
          shape: 'spheroid', params: { radius: 0.13 },
          transform: { scaleY: 0.6, scaleX: 1.4, scaleZ: 1.4 },
          color: 0xb4c4c8,
          biomeColor: { source: 'terrain', influence: 0.45 },
          biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
        },
        {
          id: 'cold-agave',
          shape: 'cone', params: { bottomR: 0.2, height: 0.18, radialSegs: 6, heightSegs: 1 },
          transform: { localPos: { x: -0.05, y: 0, z: -0.05 }, scaleY: 0.55, scaleX: 1.6, scaleZ: 1.6 },
          color: 0x9db8b0,
          biomeColor: { source: 'accent', influence: 0.55 },
          biomeScale: { biome_tundra: 0.85, biome_frigid_silence: 0.85 },
        },
        {
          id: 'cold-spar',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.015, height: 0.25, segments: 5 },
          transform: { localPos: { x: -0.22, y: 0, z: 0.12 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.8 },
          color: 0xb8d4da,
          biomeColor: { source: 'accent', influence: 0.5 },
        },
      ],
    },
    {
      id: 'salt-crust',
      weight: 0.1,
      biomeWeight: { biome_mourning_marsh: 0.6 },
      parts: [
        {
          id: 'salt-mound',
          shape: 'spheroid', params: { radius: 0.14 },
          transform: { scaleY: 0.4, scaleX: 1.6, scaleZ: 1.6 },
          color: 0x8e9490,
          biomeColor: { source: 'terrain', influence: 0.55 },
        },
        {
          id: 'salt-crust-a',
          shape: 'cube', params: { size: 0.07 },
          transform: { localPos: { x: -0.2, y: 0, z: -0.02 } },
          color: 0xa5aeab,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
        {
          id: 'salt-stalk',
          shape: 'cylinder', params: { bottomR: 0.02, topR: 0.032, height: 0.32, segments: 5 },
          transform: { localPos: { x: 0.14, y: 0, z: -0.06 } },
          stretch: { y: { min: 0.85, max: 1.15, seed: 6 }, x: false, z: false },
          color: 0x6f7c76,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
      ],
    },
    {
      id: 'dead-cactus',
      weight: 0.05,
      biomeWeight: { biome_sere_wastes: 0.5, biome_scorch: 0.3 },
      parts: [
        {
          id: 'dead-rib',
          shape: 'cylinder', params: { bottomR: 0.045, topR: 0.02, height: 0.4, segments: 5 },
          transform: { localPos: { x: -0.18, y: 0, z: 0.03 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -1.1 },
          color: 0xe2d7bd,
          biomeColor: { source: 'terrain', influence: 0.5 },
        },
        {
          id: 'dead-chip',
          shape: 'cube', params: { size: 0.05 },
          transform: { localPos: { x: -0.06, y: 0, z: 0.13 } },
          color: 0xe6dcc3,
        },
      ],
    },
  ],
};
