/**
 * decor/plateau.js — Descriptor data for "Plateau Scrub".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const PLATEAU_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'plateau',
  kind: 'decor',
  displayName: 'Plateau decor',
  cluster: { min: 3, max: 7, rule: 'uniform' },
  size: { min: 0.85, max: 1.15 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.12, offsetMax: 0.42, separation: 0.38 },
  emphasis: { behavior: 'dispersed' },
  repeatPenalty: 0.4,
  motifs: [
    {
      motif: 'stone',
      weight: 0.6,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'tuft',
      weight: 0.25,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    {
      motif: 'crystal',
      weight: 0.06,
      biomeWeight: { biome_edenfall: 1.2, biome_dustbleed: 1.2, biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
};
