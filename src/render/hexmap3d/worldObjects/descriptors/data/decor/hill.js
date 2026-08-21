/**
 * hill.js — Descriptor data for "Hill Mound".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
import { SUPERNATURAL_MOTIFS } from './supernatural.js';

export const HILL_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'hill',
  kind: 'decor',
  displayName: 'Hill decor',
  emphasis: { behavior: 'sunk' },
  motifs: [
    {
      motif: 'mound',
      weight: 1,
      biomeWeight: { biome_titanstain: 0, biome_unfinished_lands: 0 },
    },
    ...SUPERNATURAL_MOTIFS,
  ],
  placement: { mode: 'jitter', offset: 0.01 },
};
