/**
 * data/motifs/index.js — The shared motif library barrel.
 *
 * Motifs are hand-authored geometry blocks (NOT descriptors — they never appear
 * in ALL_DESCRIPTORS / the object browser). A decor's motif table references
 * one by id (`{ motif: 'log', weight, ... }`); normalizeDescriptor materializes
 * the shared parts and inherits the library's `size`/`placement` defaults.
 *
 * This barrel stays normalization-free on purpose: the resolve/normalize logic
 * lives in descriptorNormalize.js (which imports `motifById` here), so the
 * import graph stays acyclic — do not pull normalizePart into this module.
 *
 * Pure data — no THREE, no state.
 */
import { PAINFOREST_MOTIF } from './trees.js';
import { LOG_MOTIF } from './debris.js';

/** Every shared motif, in editor/authoring display order. */
export const ALL_MOTIFS = Object.freeze([
  PAINFOREST_MOTIF,
  LOG_MOTIF,
]);

const byId = new Map(ALL_MOTIFS.map((m) => [m.id, m]));

/** The raw shared motif for an id, or null. */
export function motifById(id) {
  return byId.get(id) ?? null;
}
