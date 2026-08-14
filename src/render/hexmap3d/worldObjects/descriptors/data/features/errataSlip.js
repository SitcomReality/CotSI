/**
 * errataSlip.js — Descriptor data for "Errata Slip".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
/**
 * errataSlip.js — Descriptor data for "Errata Slip".
 */
export const ERRATA_SLIP_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'errataSlip',
  kind: 'feature',
  displayName: 'Errata Slip',
  scale: 1.0,
  cluster: { rule: 'uniform', min: 2, max: 4 },
  placement: { mode: 'jitter', offset: 0.15, tiltMin: 0.2, tiltMax: 0.6, tiltSeed: 42 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'parchment',
      shape: 'box',
      params: { width: 0.18, height: 0.01, depth: 0.28 },
      transform: { lift: 0.05 },
      color: 0xfdf5e6,
    },
    {
      id: 'magical-sigil',
      shape: 'box',
      params: { width: 0.12, height: 0.012, depth: 0.2 },
      transform: { lift: 0.051 },
      color: 0x9370db,
    },
    {
      id: 'aura',
      shape: 'torus',
      params: { radius: 0.15, tube: 0.005, radialSegs: 4 },
      transform: { lift: 0.05 },
      color: 0xe6e6fa,
    }
  ],
};