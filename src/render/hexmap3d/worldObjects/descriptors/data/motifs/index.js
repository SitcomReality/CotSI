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
import { TAIGAWOOD_MOTIF } from './taigawood.js';
import { DRYWOOD_MOTIF } from './drywood.js';
import { DEADWOOD_MOTIF } from './deadwood.js';
import { VIOLETWOOD_MOTIF } from './violetwood.js';
import { GNARLED_TREE_MOTIF } from './gnarledTree.js';
import { LOG_MOTIF } from './log.js';
import {
  FLOWER_MOTIF,
  STALK_MOTIF,
  CLOD_MOTIF,
  DRIFTWOOD_MOTIF,
  STONE_MOTIF,
  SHELL_MOTIF,
  GLASS_MOTIF,
  WRACK_MOTIF,
  MUD_MOTIF,
  TUSSOCK_MOTIF,
  PAD_MOTIF,
  CRUST_MOTIF,
  ORB_MOTIF,
  RUBBLE_MOTIF,
  CRYSTAL_MOTIF,
  SHRUB_MOTIF,
} from './debris.js';
import { CACTUS_MOTIF } from './cactus.js';
import { COLD_MOUND_MOTIF } from './coldMound.js';
import { SALT_CRUST_MOTIF } from './saltCrust.js';
import { DEAD_CACTUS_MOTIF } from './deadCactus.js';
import { CATTAIL_MOTIF } from './cattail.js';
import { TUFT_MOTIF } from './tuft.js';
import { BOULDER_MOTIF } from './boulder.js';
import { MOUND_MOTIF } from './mound.js';
import { MOUND_PLAINS_MOTIF } from './moundPlains.js';
import { ROCK_MOTIF } from './rock.js';
import { BONE_MOTIF } from './bone.js';
import { BONE_STALK_MOTIF } from './boneStalk.js';
import { SHARD_MOTIF } from './shard.js';
import { SPAR_MOTIF } from './spar.js';
import { REED_MOTIF } from './reed.js';
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
  ROUND_TREE_MOTIF,
  CONIFER_MOTIF,
  DEAD_TREE_MOTIF,
  TALL_TREE_MOTIF,
  TAIGAWOOD_MOTIF,
  DRYWOOD_MOTIF,
  DEADWOOD_MOTIF,
  VIOLETWOOD_MOTIF,
  GNARLED_TREE_MOTIF,
  LOG_MOTIF,
  FLOWER_MOTIF,
  STALK_MOTIF,
  CLOD_MOTIF,
  DRIFTWOOD_MOTIF,
  STONE_MOTIF,
  SHELL_MOTIF,
  GLASS_MOTIF,
  WRACK_MOTIF,
  MUD_MOTIF,
  TUSSOCK_MOTIF,
  PAD_MOTIF,
  CRUST_MOTIF,
  ORB_MOTIF,
  RUBBLE_MOTIF,
  CRYSTAL_MOTIF,
  SHRUB_MOTIF,
  CACTUS_MOTIF,
  COLD_MOUND_MOTIF,
  SALT_CRUST_MOTIF,
  DEAD_CACTUS_MOTIF,
  CATTAIL_MOTIF,
  TUFT_MOTIF,
  BOULDER_MOTIF,
  MOUND_MOTIF,
  MOUND_PLAINS_MOTIF,
  ROCK_MOTIF,
  BONE_MOTIF,
  BONE_STALK_MOTIF,
  SHARD_MOTIF,
  SPAR_MOTIF,
  REED_MOTIF,
  BLOOD_POOL_MOTIF,
  GHOST_SPARK_MOTIF,
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
