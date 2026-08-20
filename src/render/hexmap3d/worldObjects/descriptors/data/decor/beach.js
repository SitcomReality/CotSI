/**
 * decor/beach.js — Descriptor data for "Beach decor".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const BEACH_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'beach',
  kind: 'decor',
  displayName: 'Beach decor',
  cluster: { min: 5, max: 8, rule: 'uniform' },
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
      motif: 'driftwood',
      weight: 0.25,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stone',
      weight: 0.2,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shell',
      weight: 0.15,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'glass',
      weight: 0.08,
      biomeWeight: { biome_edenfall: 1.5, biome_dustbleed: 1.5, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'bone',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'wrack',
      weight: 0.04,
      biomeWeight: { biome_mourning_marsh: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
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
