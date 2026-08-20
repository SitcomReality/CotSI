/**
 * decor/desert.js — Descriptor data for "Desert decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const DESERT_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'desert',
  kind: 'decor',
  displayName: 'Desert decor',
  cluster: { min: 6, max: 8 },
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
      motif: 'rock',
      weight: 0.45,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shrub',
      weight: 0.2,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'coldMound',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'saltCrust',
      weight: 0.1,
      biomeWeight: { biome_mourning_marsh: 0.6, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'deadCactus',
      weight: 0.05,
      biomeWeight: { biome_sere_wastes: 0.5, biome_scorch: 0.3, biome_titanstain: 0, biome_unfinished_lands: 0 },
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
