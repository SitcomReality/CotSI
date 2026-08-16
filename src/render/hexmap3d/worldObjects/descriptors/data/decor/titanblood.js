/**
 * titanblood.js — Descriptor data for "Titanblood".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * Placeholder decor for the Titanstain biome's water terrains — dark blood
 * pools that will be redesigned into proper crazy geometry.
 */
export const TITANBLOOD_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'titanblood',
  kind: 'decor',
  displayName: 'Titanblood decor',
  cluster: { min: 1, max: 2 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'blood-pool',
      shape: 'spheroid',
      params: { radius: 0.1 },
      transform: { scaleY: 0.3 },
      color: 0x8a0f24,
      biomeColor: { source: 'exotic', influence: 0.8 },
    },
  ],
};
