/**
 * nest.js — Nest/ungroup restructure: wrapping a node in a fresh group
 * (position-preserving) and the exact-inverse ungroup fold.
 */
import { isGroupNode, siblingList } from '../walk.js';
import { freshId, motifScoped, makeGroupNode, rootToNestedTransform } from '../nodes/index.js';
import { foldChildTransform } from './frameMath.js';

/**
 * Wrap the node at `entry` in a fresh group, preserving its on-screen
 * position: the new group (identity transform) replaces the node in its parent
 * list, and the node becomes the group's only child. A nested node keeps its
 * transform untouched; a ROOT leaf converts to the nested field set via
 * rootToNestedTransform. Returns the new group node. `motifId` (the active
 * motif, null outside motif decors) scopes the fresh group id under the motif
 * (decorComposition.md §6.2).
 */
export function nestNode(parts, entry, motifId = null) {
  const list = siblingList(parts, entry);
  const group = makeGroupNode(freshId(parts, motifScoped('group', motifId)));
  if (entry.parent === null && !isGroupNode(entry.node)) {
    entry.node.transform = rootToNestedTransform(entry.node.transform);
  }
  list[entry.index] = group;
  group.children.push(entry.node);
  return group;
}

/**
 * Whether a node can be ungrouped exactly. Folding a group's transform into
 * its children is exact only when the group's scale is identity — with a
 * non-uniform scale, a rotated child's frame would shear (one node's
 * T·R·R_y·S cannot express scale × rotation). Callers should disable the
 * action when this is false.
 */
export function canUngroup(node) {
  if (!isGroupNode(node)) return false;
  const t = node.transform ?? {};
  return (t.scaleX ?? 1) === 1 && (t.scaleY ?? 1) === 1 && (t.scaleZ ?? 1) === 1;
}

/**
 * Ungroup the group at `entry`: replace it with its children (in order) in the
 * parent list, folding the group's transform into each child so the visuals
 * stay identical (exact when canUngroup is true — callers must guard). Returns
 * the promoted children.
 */
export function ungroupNode(parts, entry) {
  const group = entry.node;
  const list = siblingList(parts, entry);
  const t = group.transform ?? {};
  const folded = group.children.map((child) => {
    child.transform = foldChildTransform(child.transform ?? {}, t);
    return child;
  });
  list.splice(entry.index, 1, ...folded);
  return folded;
}
