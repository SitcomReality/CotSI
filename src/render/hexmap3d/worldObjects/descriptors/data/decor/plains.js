/**
 * decor/plains.js — Descriptor data for "Plains Meadow".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
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
      motif: 'boulder',
      weight: 0.25,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'flower',
      weight: 0.15,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'stalk',
      weight: 0.15,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'moundPlains',
      weight: 0.05,
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'clod',
      weight: 0.04,
      biomeWeight: { biome_sere_wastes: 0.6, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'shard',
      weight: 0.04,
      biomeWeight: { biome_dustbleed: 0.8, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    // Titanstain land — the corrupted titanflesh: spires, teeth, boils,
    // nodules, and tendrils. Present only under biome_titanstain (the table's
    // other motifs are zeroed there), this is the only look on those hexes.
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
    // Unfinished Lands' half-formed fragments — pillars, cubes, shards, cones,
    // and orbs, present only under biome_unfinished_lands.
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
