/**
 * decor/water.js — Descriptor data for "Water".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 *
 * The base `water` terrain decor. Water is BARE on the natural biomes — the
 * `bare` motif renders nothing — and only the supernatural biomes' pools fill
 * it (titanstain → blood pools, unfinished lands → spring pools + sparks).
 * Those are now a single shared-library `pool` reference folded into this
 * table, so the terrain reads empty in the mortal world and corrupted only
 * under the supernatural biomes.
 */
export const WATER_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'water',
  kind: 'decor',
  displayName: 'Water decor',
  cluster: { min: 1, max: 1, rule: 'uniform' },
  placement: { mode: 'scatter', offsetMin: 0.1, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  motifs: [
    // The bare look on natural biomes — an alternatives choice whose only
    // option is empty, so a natural water tile renders nothing while the table
    // stays non-empty (avoiding the all-excluded fallback that would surface
    // the pools). Excluded under both supernatural biomes.
    {
      id: 'bare-water',
      weight: 1,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
      parts: [
        {
          id: 'bare-water-slot',
          default: 'bare-water-none',
          alternatives: [{ id: 'bare-water-none', parts: [] }],
        },
      ],
    },
    // Titanstain's bleeding water + Unfinished Lands' ghost pools — present
    // only under those biomes; the `pool` motif's alternatives pick the
    // material (blood vs spring vs spark) per biome.
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
