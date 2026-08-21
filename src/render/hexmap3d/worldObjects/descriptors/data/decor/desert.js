/**
 * decor/desert.js — Descriptor data for "Desert decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const DESERT_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'desert',
  kind: 'decor',
  displayName: 'Desert decor',
  cluster: { min: 3, max: 6 },
  size: { min: 0.9, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMax: 0.45, separation: 0.42 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      motif: 'cactus',
      weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stone',
      weight: 0.45,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shrub',
      weight: 0.2,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'pile',
      weight: 0.15,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7, biome_mourning_marsh: 0.6, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
