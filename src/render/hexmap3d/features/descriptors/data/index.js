/**
 * data/index.js — Barrel for the migrated descriptor data.
 *
 * Every current feature archetype and both decor kinds now live here as JSON
 * descriptor data — the single source of truth the editor loads and the
 * generic mesh builder consumes (see descriptors/recordBuilder.js).
 *
 * Migrated content:
 *   - all 26 simple feature archetypes from FEATURE_VISUALS (simpleFeatures.js)
 *   - tree groves, solitary trees, the Elder Tree (trees.js)
 *   - hill mounds (hills.js), mountains (mountains.js), knots (knots.js)
 *
 * Not yet migrated (parity gaps reported in the data files / futureWork.md):
 * fruit trees and painforest gnarled groves — their per-tree procedural
 * construction is beyond the static-parts descriptor model; they keep their
 * hard-coded builders.
 */
import { SIMPLE_FEATURE_DESCRIPTORS } from './simpleFeatures.js';
import { GROVE_DESCRIPTOR, TREE_DESCRIPTOR, LARGETREE_DESCRIPTOR } from './trees.js';
import { HILL_DESCRIPTOR } from './hills.js';
import { MOUNTAIN_DESCRIPTOR } from './mountains.js';
import { KNOT_DESCRIPTOR } from './knots.js';

/** Every migrated descriptor, in editor-display order. */
export const ALL_DESCRIPTORS = [
  ...SIMPLE_FEATURE_DESCRIPTORS,
  GROVE_DESCRIPTOR,
  TREE_DESCRIPTOR,
  LARGETREE_DESCRIPTOR,
  HILL_DESCRIPTOR,
  MOUNTAIN_DESCRIPTOR,
  KNOT_DESCRIPTOR,
];

const byId = new Map(ALL_DESCRIPTORS.map((d) => [d.id, d]));

/** Look up a migrated descriptor by id, or null. */
export function descriptorById(id) {
  return byId.get(id) ?? null;
}
