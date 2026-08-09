/**
 * witnessStone.js — Descriptor data for "Witness Stone".
 */
export const WITNESS_STONE_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'witnessStone',
  kind: 'feature',
  displayName: 'Witness Stone',
  scale: 1.25,
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'megalith-body',
      shape: 'spheroid',
      params: { radius: 0.25 },
      transform: { scaleY: 2.0 },
      color: 0x2f4f4f,
    },
    {
      id: 'sclera',
      shape: 'spheroid',
      params: { radius: 0.1 },
      transform: { localPos: { x: 0, y: 0.65, z: 0.22 }, scaleY: 0.6, scaleZ: 0.3 },
      color: 0xffffff,
    },
    {
      id: 'pupil',
      shape: 'spheroid',
      params: { radius: 0.04 },
      transform: { localPos: { x: 0, y: 0.65, z: 0.24 }, scaleZ: 0.1 },
      color: 0x8b0000,
    }
  ],
};