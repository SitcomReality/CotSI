/**
 * decor/forest.js — Descriptor data for "Forest decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const FOREST_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'forest',
  kind: 'decor',
  displayName: 'Forest decor',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.35,
  motifs: [
    {
      motif: 'roundTree',
      weight: 0.3,
      biomeWeight: {
        biome_tundra: 0.15,
        biome_frigid_silence: 0.15,
        biome_scorch: 0.3,
        biome_sere_wastes: 0.1,
        biome_mourning_marsh: 0.4,
        biome_dustbleed: 0.5,
        biome_edenfall: 2,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'conifer',
      weight: 0.22,
      biomeWeight: {
        biome_tundra: 3,
        biome_frigid_silence: 3.2,
        biome_sere_wastes: 0.1,
        biome_scorch: 0.15,
        biome_mourning_marsh: 0.7,
        biome_edenfall: 0.7,
        biome_painforest: 0.05,
        biome_dustbleed: 0.4,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'gnarledTree',
      weight: 0.08,
      biomeWeight: {
        biome_painforest: 5,
        biome_tundra: 0.1,
        biome_frigid_silence: 0.2,
        biome_dustbleed: 0,
        biome_edenfall: 0.2,
        biome_mourning_marsh: 0.2,
        biome_scorch: 0.1,
        biome_sere_wastes: 0.05,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'deadTree',
      weight: 0.1,
      size: { min: 1.35, max: 1.6 },
      biomeWeight: {
        biome_sere_wastes: 5,
        biome_tundra: 0.4,
        biome_frigid_silence: 0.2,
        biome_edenfall: 0.1,
        biome_dustbleed: 0.5,
        biome_mourning_marsh: 0.3,
        biome_painforest: 0.05,
        biome_scorch: 2,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'log',
      weight: 0.06,
      biomeWeight: {
        biome_mourning_marsh: 1.5,
        biome_painforest: 1.2,
        biome_dustbleed: 1.2,
        biome_scorch: 1,
        biome_frigid_silence: 1,
        biome_sere_wastes: 0.8,
        biome_tundra: 0.8,
        biome_edenfall: 0.6,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
