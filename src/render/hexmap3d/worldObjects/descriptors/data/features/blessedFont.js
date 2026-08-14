/**
 * blessedFont.js — Descriptor data for "Blessed Font".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * A small stone font/well whose basin fills with blessed water. Mechanically a
 * Moonberry Tree replacement: heals on arrival and replenishes after N days.
 */
export const BLESSED_FONT_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'blessedFont',
  kind: 'feature',
  displayName: 'Blessed Font',
  scale: 1.1,
  placement: { mode: 'center' },
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
      transform: { y: 0.12 },
      color: 0xb9c0c8,
    },
    {
      id: 'font-water',
      shape: 'cylinder',
      params: { bottomR: 0.2, topR: 0.2, height: 0.02, segments: 8 },
      transform: { y: 0.3 },
      color: 0x6fd4e8,
    },
    {
      id: 'font-rim',
      shape: 'torus',
      params: { radius: 0.3, tube: 0.045, radialSegs: 6 },
      transform: { y: 0.32, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.5708 },
      color: 0xd6dde4,
    },
  ],
};
