/**
 * unfinishedScrap.js — Descriptor data for "Unfinished Scrap".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * Placeholder decor for the Unfinished Lands biome's land terrains — half-
 * formed shards that will be redesigned into proper crazy geometry.
 */
export const UNFINISHED_SCRAP_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'unfinishedScrap',
  kind: 'decor',
  displayName: 'Unfinished Scrap',
  cluster: { min: 2, max: 3 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.4, separation: 0.4 },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'half-prism',
      shape: 'cylinder',
      params: { bottomR: 0.06, topR: 0.06, height: 0.08, segments: 3 },
      color: 0xbcd8e0,
      biomeColor: { source: 'terrain', influence: 0.7 },
    },
    {
      id: 'ghost-shard',
      shape: 'cone',
      params: { bottomR: 0.05, height: 0.16, radialSegs: 3 },
      transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.2 },
      color: 0x6ad0e8,
      biomeColor: { source: 'accent', influence: 0.5 },
    },
  ],
};
