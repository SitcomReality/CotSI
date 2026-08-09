/**
 * cinderbloom.js — Descriptor data for "Cinderbloom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const CINDERBLOOM_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'cinderbloom',
  kind: 'feature',
  displayName: 'Cinderbloom',
  scale: 1.8,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  variation: { colorJitter: 0.06 },
  parts: [
    {
      id: 'stem',
      shape: 'cylinder',
      params: { bottomR: 0.035, topR: 0.025, height: 0.32, segments: 6 },
      color: 0x49352c,
    },
    {
      id: 'ember-bloom',
      shape: 'cone',
      params: { bottomR: 0.17, height: 0.2, radialSegs: 7, heightSegs: 1 },
      transform: { lift: 0.3 },
      color: 0xd64228,
    },
    {
      id: 'ember-core',
      shape: 'sphere',
      params: { radius: 0.07, wSegs: 7, hSegs: 4 },
      transform: { lift: 0.36 },
      color: 0xffb52e,
    },
    {
      id: 'ash-petal',
      shape: 'spheroid',
      params: { radius: 0.055 },
      transform: {
        localPos: { x: 0.11, y: 0.39, z: 0 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 0.65,
      },
      color: 0x7f3029,
    },
  ],
};
