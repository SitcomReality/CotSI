/**
 * decor/plains.js — Descriptor data for "Plains Meadow".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const PLAINS_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'plains',
  kind: 'decor',
  displayName: 'Plains decor',
  cluster: { min: 5, max: 8, rule: 'uniform' },
  size: { min: 0.8, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.38, separation: 0.32 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      motif: 'tuft',
      weight: 0.35,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stone',
      weight: 0.29,
      biomeWeight: { biome_sere_wastes: 0.6, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'flower',
      weight: 0.15,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'pile',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shard',
      weight: 0.04,
      biomeWeight: { biome_dustbleed: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
