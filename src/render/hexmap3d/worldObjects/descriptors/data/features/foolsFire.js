/**
 * foolsFire.js — Descriptor data for "Fool's Fire".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const FOOLS_FIRE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'foolsFire',
  kind: 'feature',
  displayName: 'Fool\'s Fire',
  scale: 1.2,
  emphasis: { behavior: 'dispersed' },
  material: { emissive: 0xeed8aa, emissiveIntensity: 0.2 },
  parts: [
    {
      id: 'brazier-pedestal',
      shape: 'cylinder',
      params: { bottomR: 0.16, topR: 0.22, height: 0.18 },
      color: 0x1a1a2e,
    },
    {
      id: 'charred-runes',
      shape: 'torus',
      params: { radius: 0.18 },
      transform: { y: 0.18, lift: 0 },
      color: 0x2b2d42,
    },
    {
      id: 'fire-core',
      shape: 'spheroid',
      params: { radius: 0.14, hSegs: 5 },
      transform: {
        y: 0.22,
        lift: 0,
        scaleY: 1.4,
        localPos: { x: 0, y: 0.1, z: 0 },
      },
      color: 0xe5a50a,
    },
    {
      id: 'flame-swirl-1',
      shape: 'cone',
      params: { bottomR: 0.08, height: 0.28, radialSegs: 5 },
      transform: {
        y: 0.25,
        lift: 0,
        localPos: { x: 0.04, y: 0.08, z: 0.04 },
        localAxis: { x: 1, y: 0, z: 1 },
        localAngle: 0.2,
      },
      color: 0xc64600,
    },
    {
      id: 'flame-swirl-2',
      shape: 'cone',
      params: { bottomR: 0.07, height: 0.25, radialSegs: 5 },
      transform: {
        y: 0.25,
        lift: 0,
        localPos: { x: -0.05, y: 0.08, z: -0.03 },
        localAxis: { x: -1, y: 0, z: 0.5 },
        localAngle: 0.25,
      },
      color: 0xe66100,
    },
  ],
};
