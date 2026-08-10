/**
 * treasureChest.js — Descriptor data for "Treasure Chest".
 */
export const TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'treasureChest',
  kind: 'feature',
  displayName: 'Treasure Chest',
  scale: 1.2,
  placement: { mode: 'scatter', offsetMin: 0, offsetMax: 0.1 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'chest-base',
      shape: 'box',
      params: { width: 0.35, height: 0.22, depth: 0.25 },
      color: 0x5c4033,
    },
    {
      id: 'chest-lid',
      shape: 'box',
      params: { width: 0.35, height: 0.08, depth: 0.25 },
      transform: { lift: 0.22 },
      color: 0x4a3022,
    },
    {
      id: 'iron-strap-left',
      shape: 'box',
      params: { width: 0.03, height: 0.305, depth: 0.255 },
      transform: { localPos: { x: -0.12, y: 0, z: 0 } },
      color: 0x222222,
    },
    {
      id: 'iron-strap-right',
      shape: 'box',
      params: { width: 0.03, height: 0.305, depth: 0.255 },
      transform: { localPos: { x: 0.12, y: 0, z: 0 } },
      color: 0x222222,
    },
    {
      id: 'golden-lock',
      shape: 'cube',
      params: { size: 0.045 },
      transform: { localPos: { x: 0, y: 0.19, z: 0.13 } },
      color: 0xffd700,
    }
  ],
};