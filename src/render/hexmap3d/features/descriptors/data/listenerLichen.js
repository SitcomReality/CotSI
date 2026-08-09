/**
 * listenerLichen.js — Descriptor data for "Listener Lichen".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const LISTENER_LICHEN_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'listenerLichen',
  kind: 'feature',
  displayName: 'Listener Lichen',
  scale: 1.6,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'lichen-mat',
      shape: 'spheroid',
      params: { radius: 0.2 },
      transform: { scaleX: 1.3, scaleY: 0.48, scaleZ: 0.85 },
      color: 0x78966e,
    },
    {
      id: 'ear-one',
      shape: 'torus',
      params: { radius: 0.08, tube: 0.018, radialSegs: 6, tubularSegs: 10 },
      transform: {
        localPos: { x: -0.09, y: 0.13, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5707963267948966,
      },
      color: 0xb0bf82,
    },
    {
      id: 'ear-two',
      shape: 'torus',
      params: { radius: 0.08, tube: 0.018, radialSegs: 6, tubularSegs: 10 },
      transform: {
        localPos: { x: 0.09, y: 0.13, z: 0 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 1.5707963267948966,
      },
      color: 0x9eaf76,
    },
  ],
};
