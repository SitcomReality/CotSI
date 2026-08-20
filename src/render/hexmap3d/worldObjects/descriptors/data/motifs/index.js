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
import { BLOOD_POOL_MOTIF } from './bloodPool.js';
import { GHOST_SPARK_MOTIF } from './ghostSpark.js';
import { SPRING_POOL_MOTIF } from './springPool.js';
import { TITAN_BOIL_MOTIF } from './titanBoil.js';
import { TITAN_NODULE_MOTIF } from './titanNodule.js';
import { TITAN_SPIRE_MOTIF } from './titanSpire.js';
import { TITAN_TENDRIL_MOTIF } from './titanTendril.js';
import { TITAN_TOOTH_MOTIF } from './titanTooth.js';
import { YET_FRAGMENT_CONE_MOTIF } from './yetFragmentCone.js';
import { YET_FRAGMENT_CUBE_MOTIF } from './yetFragmentCube.js';
import { YET_FRAGMENT_ORB_MOTIF } from './yetFragmentOrb.js';
import { YET_FRAGMENT_PILLAR_MOTIF } from './yetFragmentPillar.js';
import { YET_FRAGMENT_SHARD_MOTIF } from './yetFragmentShard.js';

/** Every shared motif, in editor/authoring display order. */
export const ALL_MOTIFS = Object.freeze([
  BLOOD_POOL_MOTIF,
  GHOST_SPARK_MOTIF,
  LOG_MOTIF,
  PAINFOREST_MOTIF,
  SPRING_POOL_MOTIF,
  TITAN_BOIL_MOTIF,
  TITAN_NODULE_MOTIF,
  TITAN_SPIRE_MOTIF,
  TITAN_TENDRIL_MOTIF,
  TITAN_TOOTH_MOTIF,
  YET_FRAGMENT_CONE_MOTIF,
  YET_FRAGMENT_CUBE_MOTIF,
  YET_FRAGMENT_ORB_MOTIF,
  YET_FRAGMENT_PILLAR_MOTIF,
  YET_FRAGMENT_SHARD_MOTIF,
]);

const byId = new Map(ALL_MOTIFS.map((m) => [m.id, m]));

/** The raw shared motif for an id, or null. */
export function motifById(id) {
  return byId.get(id) ?? null;
}
