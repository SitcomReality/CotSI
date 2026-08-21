/**
 * decor/beach.js — Descriptor data for "Beach decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const BEACH_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'beach',
  kind: 'decor',
  displayName: 'Beach decor',
  cluster: { min: 3, max: 6, rule: 'uniform' },
  size: { min: 0.85, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.38, separation: 0.34 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.5,
  motifs: [
    {
      motif: 'tuft',
      weight: 0.3,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'log',
      weight: 0.25,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stone',
      weight: 0.2,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'pile',
      weight: 0.19,
      biomeWeight: { biome_mourning_marsh: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shard',
      weight: 0.08,
      biomeWeight: { biome_edenfall: 1.5, biome_dustbleed: 1.5, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'bone',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
