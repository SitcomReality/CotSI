/**
 * decor/deepWood.js — Descriptor data for "Deep Wood decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const DEEP_WOOD_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'deepWood',
  kind: 'decor',
  displayName: 'Deep Wood decor',
  cluster: { rule: 'moisture', countsByTerrain: { deepWood: [4, 7] } },
  size: { min: 1.3, max: 1.5 },
  variation: { colorJitter: 0.05 },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.35,
  motifs: [
    {
      motif: 'tallTree',
      weight: 0.52,
      biomeWeight: {
        biome_tundra: 0.55,
        biome_frigid_silence: 0.55,
        biome_scorch: 4.3,
        biome_sere_wastes: 0.5,
        biome_mourning_marsh: 0.6,
        biome_edenfall: 3,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'conifer',
      weight: 0.12,
      biomeWeight: { biome_tundra: 5, biome_scorch: 0.2, biome_sere_wastes: 0.2, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'gnarledTree',
      weight: 0.08,
      biomeWeight: { biome_painforest: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'deadTree',
      weight: 0.1,
      biomeWeight: { biome_sere_wastes: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2, biome_edenfall: 0.3, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
