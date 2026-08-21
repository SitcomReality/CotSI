/**
 * decor/marsh.js — Descriptor data for "Marsh Reeds".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const MARSH_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'marsh',
  kind: 'decor',
  displayName: 'Marsh decor',
  cluster: { rule: 'moisture', countsByTerrain: { marsh: [4, 6] }, densityRange: [0.45, 0.85], jitter: 1 },
  size: { min: 0.9, max: 1.25 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.4, separation: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.5,
  motifs: [
    {
      motif: 'cattail',
      weight: 0.25,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'pile',
      weight: 0.45,
      biomeWeight: { biome_scorch: 0.7, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'tuft',
      weight: 0.2,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stone',
      weight: 0.07,
      biomeWeight: { biome_edenfall: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shard',
      weight: 0.03,
      biomeWeight: { biome_dustbleed: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
