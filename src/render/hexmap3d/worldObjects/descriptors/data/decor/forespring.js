/**
 * forespring.js — Descriptor data for "Forespring".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * Placeholder decor for the Unfinished Lands biome's water terrains — ghostly
 * spring pools that will be redesigned into proper crazy geometry.
 */
export const FORESPRING_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'forespring',
  kind: 'decor',
  displayName: 'Forespring decor',
  cluster: { min: 1, max: 2 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'spring-pool',
      shape: 'spheroid',
      params: { radius: 0.09 },
      transform: { scaleY: 0.3 },
      color: 0x5ad0f0,
      biomeColor: { source: 'accent', influence: 0.8 },
    },
    {
      id: 'ghost-spark',
      shape: 'sphere',
      params: { radius: 0.02 },
      transform: { localPos: { x: 0.05, y: 0.02, z: 0.03 } },
      color: 0xffffff,
      biomeColor: { source: 'primary', influence: 0.4 },
    },
  ],
};
