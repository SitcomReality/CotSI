/**
 * errataSlip.js — Descriptor data for "Errata Slip".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const ERRATA_SLIP_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'errataSlip',
  kind: 'feature',
  displayName: 'Errata Slip',
  scale: 1.5,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'paper',
      shape: 'box',
      params: { width: 0.28, height: 0.018, depth: 0.18 },
      transform: {
        y: 0.012,
        rotY: -0.22,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      },
      color: 0xf0e4c5,
    },
    {
      id: 'red-correction',
      shape: 'box',
      params: { width: 0.15, height: 0.006, depth: 0.012 },
      transform: {
        localPos: { x: 0.02, y: 0.02, z: 0.025 },
        rotY: -0.18,
      },
      color: 0xb83b3b,
    },
    {
      id: 'ink-mark',
      shape: 'box',
      params: { width: 0.07, height: 0.006, depth: 0.01 },
      transform: {
        localPos: { x: -0.075, y: 0.021, z: -0.035 },
        rotY: 0.3,
      },
      color: 0x39445d,
    },
  ],
};
