/**
 * decor/river.js — Descriptor data for "River".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * The base `river` terrain decor, mirroring `water`: bare on the natural
 * biomes (the `bare` motif renders nothing) with the supernatural pools folded
 * in as shared-library motif references. Passable, costly terrain.
 */
export const RIVER_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'river',
  kind: 'decor',
  displayName: 'River decor',
  cluster: { min: 1, max: 1, rule: 'uniform' },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  motifs: [
    {
      id: 'bare-river',
      weight: 1,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
      parts: [
        {
          id: 'bare-river-slot',
          default: 'bare-river-none',
          alternatives: [{ id: 'bare-river-none', parts: [] }],
        },
      ],
    },
    {
      motif: 'bloodPool',
      weight: 1,
      biomeWeight: {
        biome_default: 0,
        biome_dustbleed: 0,
        biome_edenfall: 0,
        biome_frigid_silence: 0,
        biome_mourning_marsh: 0,
        biome_painforest: 0,
        biome_scorch: 0,
        biome_sere_wastes: 0,
        biome_tundra: 0,
        biome_unfinished_lands: 0,
      },
    },
    {
      motif: 'springPool',
      weight: 0.6,
      biomeWeight: {
        biome_default: 0,
        biome_dustbleed: 0,
        biome_edenfall: 0,
        biome_frigid_silence: 0,
        biome_mourning_marsh: 0,
        biome_painforest: 0,
        biome_scorch: 0,
        biome_sere_wastes: 0,
        biome_tundra: 0,
        biome_titanstain: 0,
      },
    },
    {
      motif: 'ghostSpark',
      weight: 0.4,
      biomeWeight: {
        biome_default: 0,
        biome_dustbleed: 0,
        biome_edenfall: 0,
        biome_frigid_silence: 0,
        biome_mourning_marsh: 0,
        biome_painforest: 0,
        biome_scorch: 0,
        biome_sere_wastes: 0,
        biome_tundra: 0,
        biome_titanstain: 0,
      },
    },
  ],
};