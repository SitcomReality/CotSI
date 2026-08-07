/**
 * data/index.js — Barrel for the migrated descriptor data.
 *
 * Every current feature archetype and both decor kinds now live here as JSON
 * descriptor data — the single source of truth the editor loads and the
 * generic mesh builder consumes (see descriptors/recordBuilder.js).
 *
 * Migrated content:
 *   - all 26 simple feature archetypes from FEATURE_VISUALS (simpleFeatures.js)
 *   - tree groves, solitary trees (trees.js)
 *   - hill mounds (hills.js), mountains (mountains.js), knots (knots.js)
 *   - ground-level terrain decor (groundDecor.js): marsh reeds, plateau mound,
 *     plains grass, desert scrub, beach driftwood
 *   - champion bases, 7 faction variants (bases.js — entity-driven)
 *   - champions, per-faction variants (champions.js — entity-driven)
 *   - mobs, per-archetype variants (mobs.js — entity-driven)
 *   - traders (traders.js — entity-driven)
 *
 * Not yet migrated (parity gaps reported in the data files / futureWork.md):
 * fruit trees and painforest gnarled groves — their per-tree procedural
 * construction is beyond the static-parts descriptor model; they keep their
 * hard-coded builders.
 */
import { SIMPLE_FEATURE_DESCRIPTORS } from './simpleFeatures.js';
import { GROVE_DESCRIPTOR, TREE_DESCRIPTOR } from './trees.js';
import { HILL_DESCRIPTOR } from './hills.js';
import { MOUNTAIN_DESCRIPTOR } from './mountains.js';
import { KNOT_DESCRIPTOR } from './knots.js';
import {
  PLAINS_GRASS_DESCRIPTOR,
  MARSH_REEDS_DESCRIPTOR,
  PLATEAU_MOUND_DESCRIPTOR,
  DESERT_SCRUB_DESCRIPTOR,
  BEACH_DRIFTWOOD_DESCRIPTOR,
} from './groundDecor.js';
import { BASE_DESCRIPTOR } from './bases.js';
import { CHAMPION_DESCRIPTOR } from './champions.js';
import { MOB_DESCRIPTOR } from './mobs.js';
import { TRADER_DESCRIPTOR } from './traders.js';

/** Every migrated descriptor, in editor-display order. */
export const ALL_DESCRIPTORS = [
  ...SIMPLE_FEATURE_DESCRIPTORS,
  GROVE_DESCRIPTOR,
  TREE_DESCRIPTOR,
  HILL_DESCRIPTOR,
  MOUNTAIN_DESCRIPTOR,
  PLAINS_GRASS_DESCRIPTOR,
  MARSH_REEDS_DESCRIPTOR,
  PLATEAU_MOUND_DESCRIPTOR,
  DESERT_SCRUB_DESCRIPTOR,
  BEACH_DRIFTWOOD_DESCRIPTOR,
  KNOT_DESCRIPTOR,
  BASE_DESCRIPTOR,
  CHAMPION_DESCRIPTOR,
  MOB_DESCRIPTOR,
  TRADER_DESCRIPTOR,
];

const byId = new Map(ALL_DESCRIPTORS.map((d) => [d.id, d]));

/** Look up a migrated descriptor by id, or null. */
export function descriptorById(id) {
  return byId.get(id) ?? null;
}
