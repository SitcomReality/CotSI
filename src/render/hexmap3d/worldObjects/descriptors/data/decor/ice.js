/**
 * decor/ice.js — Descriptor data for "Ice".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * The base `ice` terrain decor, mirroring `water`: bare on the natural biomes
 * (the `bare` motif renders nothing) with the supernatural pools folded in as a
 * single shared-library `pool` reference.
 */
export const ICE_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'ice',
  kind: 'decor',
  displayName: 'Frozen surface decor',
  cluster: { min: 1, max: 1, rule: 'uniform' },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  motifs: [
    {
      id: 'bare-ice',
      weight: 1,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
      parts: [
        {
          id: 'bare-ice-slot',
          default: 'bare-ice-none',
          alternatives: [{ id: 'bare-ice-none', parts: [] }],
        },
      ],
    },
    {
      motif: 'pool',
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
      },
    },
  ],
};
