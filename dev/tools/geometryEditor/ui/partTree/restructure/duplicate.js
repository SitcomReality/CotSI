/**
 * duplicate.js — Duplicating a part / group / alternatives choice point.
 *
 * A duplicate is a deep copy with FRESH ids for every node and option in the
 * subtree (ids are unique across the whole tree — schema-validated — so a copy
 * must not collide with the original or anything else). Every alternatives
 * choice point in the copy — top-level or nested — gets a fresh seed from the
 * reserved 100–199 lane: a choice point's seed pins its in-world rolls, so a
 * duplicated choice point with the original's seed would always pick the same
 * option as the original — for decor variation a duplicate must roll
 * independently (decorComposition.md §2.2). Everything else — transform,
 * shape, color, weights, hierarchy — is copied verbatim.
 */
import { freshId, motifScoped } from '../nodes/index.js';
import { listNodes } from '../walk.js';
import { ALTERNATIVE_SEED_MIN } from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/descriptorDefaults.js';

/**
 * The next free seed in the reserved 100–199 lane, recorded into `taken` so
 * later calls in the same duplicate skip it too (a copy holding several
 * choice points must give each a distinct seed).
 */
function nextFreeSeed(taken) {
  let seed = ALTERNATIVE_SEED_MIN;
  while (taken.has(seed)) seed++;
  taken.add(seed);
  return seed;
}

/** Assign fresh ids to the copied subtree in place (the original tree is only
 *  scanned for taken ids/seeds). Rewrites each choice point's `default` when
 *  it named a copied option, and re-seeds every copied choice point. */
function reIdNode(parts, node, motifId, takenSeeds) {
  node.id = freshId(parts, motifScoped(`${node.id}-copy`, motifId));
  for (const opt of node.alternatives ?? []) {
    const oldId = opt.id;
    opt.id = freshId(parts, motifScoped(`${oldId}-copy`, motifId));
    if (node.default === oldId) node.default = opt.id;
    for (const child of opt.parts ?? []) reIdNode(parts, child, motifId, takenSeeds);
  }
  if (Array.isArray(node.alternatives)) {
    node.seed = nextFreeSeed(takenSeeds);
  }
  for (const child of node.children ?? []) reIdNode(parts, child, motifId, takenSeeds);
}

/**
 * A deep copy of `node` with fresh ids for every node and option in its
 * subtree (and a fresh seed for every copied choice point — nested ones
 * included). The original is left untouched; the caller inserts the copy into
 * the tree.
 */
export function duplicateNode(parts, node, motifId = null) {
  const copy = JSON.parse(JSON.stringify(node));
  const takenSeeds = new Set();
  for (const e of listNodes(parts)) {
    if (e.node.seed !== undefined) takenSeeds.add(e.node.seed);
  }
  reIdNode(parts, copy, motifId, takenSeeds);
  return copy;
}

/**
 * Duplicate the node at `nodes[index]` and insert the copy right after it in
 * the SAME sibling array (its position in the hierarchy — root list, group
 * children, or option parts — is preserved). Returns the copy.
 */
export function duplicateInList(parts, nodes, index, motifId = null) {
  const copy = duplicateNode(parts, nodes[index], motifId);
  nodes.splice(index + 1, 0, copy);
  return copy;
}
