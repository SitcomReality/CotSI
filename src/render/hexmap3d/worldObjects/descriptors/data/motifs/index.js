/**
 * data/motifs/index.js — The shared motif library barrel.
 *
 * Motifs are hand-authored geometry blocks (NOT descriptors — they never appear
 * in ALL_DESCRIPTORS / the object browser). A decor's motif table references
 * one by id (`{ motif: '<libraryId>', weight, ... }`); normalizeDescriptor
 * materializes the shared parts and inherits the library's `size`/`placement`
 * defaults.
 *
 * This barrel stays normalization-free on purpose: the resolve/normalize logic
 * lives in descriptorNormalize.js (which imports `motifById` here), so the
 * import graph stays acyclic — do not pull normalizePart into this module.
 *
 * Pure data — no THREE, no state.
 */
import { ROUND_TREE_MOTIF } from './roundTree.js';
import { CONIFER_MOTIF } from './conifer.js';
import { DEAD_TREE_MOTIF } from './deadTree.js';
import { TALL_TREE_MOTIF } from './tallTree.js';
import { GNARLED_TREE_MOTIF } from './gnarledTree.js';
import { LOG_MOTIF } from './log.js';
import { STONE_MOTIF } from './stone.js';
import { PILE_MOTIF } from './pile.js';
import { SHARD_MOTIF } from './shard.js';
import { TUFT_MOTIF } from './tuft.js';
import { FLOWER_MOTIF } from './flower.js';
import { CRYSTAL_MOTIF } from './crystal.js';
import { SHRUB_MOTIF } from './shrub.js';
import { CACTUS_MOTIF } from './cactus.js';
import { CATTAIL_MOTIF } from './cattail.js';
import { MOUND_MOTIF } from './mound.js';
import { BONE_MOTIF } from './bone.js';
import { POOL_MOTIF } from './pool.js';
import { TITAN_BOIL_MOTIF } from './titanBoil.js';
import { TITAN_SPIRE_MOTIF } from './titanSpire.js';
import { YET_FRAGMENT_CUBE_MOTIF } from './yetFragmentCube.js';
import { YET_FRAGMENT_SHARD_MOTIF } from './yetFragmentShard.js';

/** Every shared motif, in editor/authoring display order. */
export const ALL_MOTIFS = Object.freeze([
  ROUND_TREE_MOTIF,
  CONIFER_MOTIF,
  DEAD_TREE_MOTIF,
  TALL_TREE_MOTIF,
  GNARLED_TREE_MOTIF,
  LOG_MOTIF,
  STONE_MOTIF,
  PILE_MOTIF,
  SHARD_MOTIF,
  TUFT_MOTIF,
  FLOWER_MOTIF,
  CRYSTAL_MOTIF,
  SHRUB_MOTIF,
  CACTUS_MOTIF,
  CATTAIL_MOTIF,
  MOUND_MOTIF,
  BONE_MOTIF,
  POOL_MOTIF,
  TITAN_BOIL_MOTIF,
  TITAN_SPIRE_MOTIF,
  YET_FRAGMENT_CUBE_MOTIF,
  YET_FRAGMENT_SHARD_MOTIF,
]);

const byId = new Map(ALL_MOTIFS.map((m) => [m.id, m]));

/** The raw shared motif for an id, or null. */
export function motifById(id) {
  return byId.get(id) ?? null;
}
