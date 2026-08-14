/**
 * halfDrawnObelisk.js — Descriptor data for "Half Drawn Obelisk".
 */
export const HALF_DRAWN_OBELISK_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'halfDrawnObelisk',
  kind: 'feature',
  displayName: 'Half Drawn Obelisk',
  scale: 1.3,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'obelisk-base',
      shape: 'cylinder',
      params: { bottomR: 0.2, topR: 0.15, height: 0.4, segments: 4 },
      transform: { rotY: 0.785 },
      color: 0x2a2a35,
    },
    {
      id: 'obelisk-mid',
      shape: 'cylinder',
      params: { bottomR: 0.14, topR: 0.11, height: 0.18, segments: 4 },
      transform: { lift: 0.45, rotY: 1.0 }, 
      color: 0x2a2a35,
    },
    {
      id: 'obelisk-top',
      shape: 'cone',
      params: { bottomR: 0.1, height: 0.25, radialSegs: 4 },
      transform: { lift: 0.68, rotY: 0.6 },
      color: 0x2a2a35,
    },
    {
      id: 'energy-core',
      shape: 'cylinder',
      params: { bottomR: 0.02, topR: 0.02, height: 0.9, segments: 4 },
      transform: { lift: 0.0, rotY: 0.785 },
      color: 0x00ffff,
    }
  ],
};