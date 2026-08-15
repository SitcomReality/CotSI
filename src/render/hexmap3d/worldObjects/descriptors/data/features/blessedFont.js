/**
 * features/blessedFont.js — Descriptor data for "Blessed Font".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const BLESSED_FONT_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'blessedFont',
  kind: 'feature',
  displayName: 'Blessed Font',
  scale: 1.1,
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'font-pedestal',
      shape: 'cylinder',
      params: { bottomR: 0.32, topR: 0.26, height: 0.14, segments: 8 },
      color: 0x9aa0a8,
    },
    {
      id: 'font-basin',
      shape: 'cylinder',
      params: { bottomR: 0.24, topR: 0.3, height: 0.2, segments: 8 },
      transform: { y: 0.12, lift: 0 },
      color: 0xb9c0c8,
    },
    {
      id: 'font-water',
      shape: 'cylinder',
      params: { bottomR: 0.2, topR: 0.27, height: 0.02, segments: 8 },
      transform: {
        y: 0.3,
        lift: 0,
        localPos: { x: 0, y: 0.065789210606547, z: 0 },
      },
      color: 0x6fd4e8,
      states: { empty: { scaleX: 0.35, scaleY: 0.2, scaleZ: 0.35, y: 0.14, color: 0x7e99a6 } },
    },
    {
      id: 'font-rim',
      shape: 'torus',
      params: { radius: 0.3, tube: 0.045, radialSegs: 6 },
      transform: {
        y: 0.32,
        lift: 0,
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5708,
      },
      color: 0xd6dde4,
    },
  ],
};
