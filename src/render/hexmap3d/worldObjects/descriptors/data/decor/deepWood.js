/**
 * decor/deepWood.js — Descriptor data for "Deep Wood decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
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
      weight: 0.3,
      biomeWeight: {
        biome_tundra: 0.15,
        biome_frigid_silence: 0.15,
        biome_scorch: 0.3,
        biome_sere_wastes: 0.2,
        biome_mourning_marsh: 0.3,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'gnarledTree',
      weight: 0.08,
      biomeWeight: { biome_painforest: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2 },
    },
    {
      motif: 'taigawood',
      weight: 0.12,
      biomeWeight: { biome_tundra: 5, biome_scorch: 0.2, biome_sere_wastes: 0.2, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'drywood',
      weight: 0.1,
      biomeWeight: {
        biome_scorch: 4,
        biome_tundra: 0.2,
        biome_frigid_silence: 0.2,
        biome_mourning_marsh: 0.3,
        biome_sere_wastes: 0.3,
        biome_titanstain: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'deadwood',
      weight: 0.1,
      biomeWeight: { biome_sere_wastes: 5, biome_tundra: 0.2, biome_frigid_silence: 0.2, biome_edenfall: 0.3, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'violetwood',
      weight: 0.12,
      biomeWeight: { biome_edenfall: 3, biome_tundra: 0.2, biome_frigid_silence: 0.2, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    // Titanstain land — corrupted titanflesh; only under biome_titanstain.
    {
      motif: 'titanSpire',
      weight: 0.3,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'titanTooth',
      weight: 0.22,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'titanBoil',
      weight: 0.25,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'titanNodule',
      weight: 0.13,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'titanTendril',
      weight: 0.1,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    // Unfinished Lands' half-formed fragments; only under biome_unfinished_lands.
    {
      motif: 'yetFragmentPillar',
      weight: 0.3,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
        biome_tundra: 0,
      },
    },
    {
      motif: 'yetFragmentCube',
      weight: 0.15,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
        biome_tundra: 0,
      },
    },
    {
      motif: 'yetFragmentShard',
      weight: 0.25,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
        biome_tundra: 0,
      },
    },
    {
      motif: 'yetFragmentCone',
      weight: 0.18,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
        biome_tundra: 0,
      },
    },
    {
      motif: 'yetFragmentOrb',
      weight: 0.12,
      biomeWeight: {
        biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
        biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
        biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
        biome_tundra: 0,
      },
    },

  ],
};
