/**
 * decor/yetlands.js — Descriptor data for "Yetlands decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const YETLANDS_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'yetlands',
  kind: 'decor',
  displayName: 'Yetlands decor',
  cluster: { min: 2, max: 4 },
  size: { min: 0.8, max: 1.3 },
  variation: { stretchY: [0.7, 1.4], stretchX: [0.8, 1.3], stretchZ: [0.8, 1.3], colorJitter: 0.08 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.42, separation: 0.38 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'yet-fragment-pillar',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.05, height: 0.32 },
      transform: { localPos: { x: -0.16, y: 0, z: -0.05 }, liftRange: { min: 0.02, max: 0.22, seed: 4 } },
      stretch: {
        y: { min: 0.8, max: 1.5, seed: 6 },
        x: false,
        z: false,
      },
      color: 0x9aa8b0,
      biomeColor: { source: 'terrain', influence: 0.35 },
    },
    {
      id: 'yet-fragment-cube',
      shape: 'cube',
      params: { size: 0.13 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.2, y: 0, z: 0.04 },
        liftRange: { min: 0.06, max: 0.28, seed: 8 },
        localAxis: { x: 1, y: 1, z: 0 },
        localAngle: 0.6,
      },
      color: 0x8a9aa2,
      biomeColor: { source: 'terrain', influence: 0.4 },
    },
    {
      id: 'yet-fragment-shard',
      shape: 'dodecahedron',
      params: { radius: 0.1 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 1.6,
        localPos: { x: -0.02, y: 0, z: 0.12 },
        liftRange: { min: 0.1, max: 0.38, seed: 10 },
      },
      color: 0xb8c4cc,
      biomeColor: { source: 'accent', influence: 0.3 },
    },
    {
      id: 'yet-fragment-cone',
      shape: 'cone',
      params: { bottomR: 0.11, height: 0.2, heightSegs: 1 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 0.9,
        localPos: { x: -0.27, y: 0, z: 0.1 },
        liftRange: { min: 0, max: 0.12, seed: 12 },
      },
      color: 0x7d8b93,
      biomeColor: { source: 'terrain', influence: 0.45 },
    },
    {
      id: 'yet-fragment-orb',
      shape: 'spheroid',
      params: { radius: 0.06 },
      transform: {
        y: 0,
        lift: 0,
        scaleX: 1.3,
        scaleY: 0.7,
        scaleZ: 1.3,
        localPos: { x: 0.08, y: 0, z: -0.18 },
        liftRange: { min: 0.16, max: 0.4, seed: 14 },
      },
      color: 0xd0d8de,
      biomeColor: { source: 'accent', influence: 0.3 },
    },
  ],
};
