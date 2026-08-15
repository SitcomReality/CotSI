/**
 * decor/plateau.js — Descriptor data for "Plateau Scrub".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const PLATEAU_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'plateau',
  kind: 'decor',
  displayName: 'Plateau Scrub',
  cluster: { min: 5, max: 8, rule: 'uniform' },
  size: { min: 0.85, max: 1.15 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.12, offsetMax: 0.42, separation: 0.38 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      id: 'boulder',
      weight: 0.3,
      parts: [
        {
          id: 'boulder-a',
          shape: 'dodecahedron', params: { radius: 0.15 },
          transform: { localPos: { x: -0.15, y: 0, z: 0 }, scaleY: 0.7, scaleX: 1.3, scaleZ: 1.1 },
          color: 0x7f7261,
          biomeColor: { source: 'terrain', influence: 0.35 },
        },
      ],
    },
    {
      id: 'tuft',
      weight: 0.25,
      parts: [
        {
          id: 'tuft-a',
          shape: 'cone', params: { bottomR: 0.17, height: 0.26, radialSegs: 6, heightSegs: 1 },
          transform: { localPos: { x: 0.02, y: 0, z: -0.08 }, scaleY: 0.75, scaleX: 1.35, scaleZ: 1.35 },
          stretch: { y: { min: 0.8, max: 1.2, seed: 4 }, x: false, z: false },
          color: 0x6e824d,
          biomeColor: { source: 'primary', influence: 0.5 },
        },
      ],
    },
    {
      id: 'rock',
      weight: 0.2,
      parts: [
        {
          id: 'rock-a',
          shape: 'dodecahedron', params: { radius: 0.1 },
          transform: { localPos: { x: 0.12, y: 0, z: 0.05 }, scaleY: 0.75, scaleX: 1.1, scaleZ: 1 },
          color: 0x94846f,
          biomeColor: { source: 'terrain', influence: 0.3 },
        },
      ],
    },
    {
      id: 'rubble',
      weight: 0.1,
      parts: [
        {
          id: 'rubble-a',
          shape: 'cube', params: { size: 0.06 },
          transform: { localPos: { x: 0.22, y: 0, z: -0.04 }, localAxis: { x: 1, y: 0, z: 1 }, localAngle: 0.6 },
          color: 0x8f8069,
          biomeColor: { source: 'terrain', influence: 0.25 },
        },
      ],
    },
    {
      id: 'crystal',
      weight: 0.06,
      biomeWeight: { biome_edenfall: 1.2, biome_dustbleed: 1.2 },
      parts: [
        {
          id: 'crystal-a',
          shape: 'dodecahedron', params: { radius: 0.12 },
          transform: { localPos: { x: -0.15, y: 0, z: 0 }, scaleY: 1.8, scaleX: 0.8, scaleZ: 0.8, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.3 },
          color: 0xb78be6,
          biomeColor: { source: 'accent', influence: 0.7 },
          biomeScale: { biome_edenfall: 1.1 },
        },
      ],
    },
    {
      id: 'spar',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.6, biome_painforest: 0.5 },
      parts: [
        {
          id: 'spar-a',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.015, height: 0.28, segments: 5 },
          transform: { localPos: { x: -0.08, y: 0, z: 0.04 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.75 },
          stretch: { y: { min: 0.8, max: 1.2, seed: 6 }, x: false, z: false },
          color: 0x9e8b72,
          biomeColor: { source: 'terrain', influence: 0.35 },
        },
        {
          id: 'spar-b',
          shape: 'cylinder', params: { bottomR: 0.02, topR: 0.012, height: 0.2, segments: 5 },
          transform: { localPos: { x: 0.14, y: 0, z: -0.05 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.9 },
          color: 0x8f7b60,
        },
      ],
    },
    {
      id: 'reed',
      weight: 0.04,
      biomeWeight: { biome_mourning_marsh: 0.7 },
      parts: [
        {
          id: 'reed-a',
          shape: 'cylinder', params: { bottomR: 0.03, topR: 0.02, height: 0.34, segments: 5 },
          transform: { localPos: { x: 0.12, y: 0, z: -0.02 }, localAxis: { x: 0, y: 0, z: 1 }, localAngle: -0.7 },
          color: 0x4a5d3e,
        },
        {
          id: 'reed-b',
          shape: 'cylinder', params: { bottomR: 0.025, topR: 0.018, height: 0.26, segments: 5 },
          transform: { localPos: { x: -0.08, y: 0, z: 0.1 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.8 },
          color: 0x5c704e,
        },
      ],
    },
  ],
};
