/**
 * data/decor/supernatural.js — Shared supernatural biome motif block.
 *
 * The Titanstain (titan*) and Unfinished Lands (yetFragment*) motif entries
 * that every land decor table folds in. Previously pasted verbatim into each
 * `data/decor/*.js`; here it lives once and is spread by the referencing decor.
 * Each entry gates itself to a single supernatural biome via present-0
 * `biomeWeight` (all biomes zeroed except the target, which is absent → ×1).
 *
 * Two motifs per supernatural biome (user decision): Titanstain keeps the
 * vertical `titanSpire` and the organic `titanBoil`; Unfinished Lands keeps the
 * rigid `yetFragmentCube` and the angular `yetFragmentShard`. Each motif
 * carries its own internal variation (see the motif data in `data/motifs/`), so
 * two shapes per biome is plenty.
 *
 * Pure data — imported by the decor tables; no THREE, no state.
 */
export const SUPERNATURAL_MOTIFS = [
  // Titanstain — corrupted titanflesh; only under biome_titanstain.
  {
    motif: 'titanSpire',
    weight: 0.4,
    biomeWeight: {
      biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
      biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
      biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
      biome_unfinished_lands: 0,
    },
  },
  {
    motif: 'titanBoil',
    weight: 0.3,
    biomeWeight: {
      biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
      biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
      biome_scorch: 0, biome_sere_wastes: 0, biome_tundra: 0,
      biome_unfinished_lands: 0,
    },
  },
  // Unfinished Lands — half-formed fragments; only under biome_unfinished_lands.
  {
    motif: 'yetFragmentCube',
    weight: 0.26,
    biomeWeight: {
      biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
      biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
      biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
      biome_tundra: 0,
    },
  },
  {
    motif: 'yetFragmentShard',
    weight: 0.36,
    biomeWeight: {
      biome_default: 0, biome_dustbleed: 0, biome_edenfall: 0,
      biome_frigid_silence: 0, biome_mourning_marsh: 0, biome_painforest: 0,
      biome_scorch: 0, biome_sere_wastes: 0, biome_titanstain: 0,
      biome_tundra: 0,
    },
  },
];
