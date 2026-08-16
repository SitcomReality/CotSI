/**
 * move.js — Reparenting restructure: moving a node into / out of an existing
 * group with exact frame conversion (identity scales only — guarded by
 * canMoveInto / canExtract).
 */
import { isGroupNode, listNodes, siblingList } from '../walk.js';
import { rootToNestedTransform, nodeRotationMatrix, rotateVec3 } from '../nodes/index.js';
import {
  mat4Identity,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../../../../src/engine/rules/mat4.js';
import { canUngroup } from './nest.js';
import { foldChildTransform, frameMatrix, rigidInverse, parentMap, frameFromRoot } from './frameMath.js';

/**
 * Whether the node at `entry` can move into `groupNode` exactly: both the
 * source frame (the node's parent) and the target group's frame must be rigid
 * (identity scale) — including every ancestor group on either path, since the
 * frame delta runs through them — and the group must not be the node itself
 * or inside its own subtree (a cycle would be created).
 */
export function canMoveInto(parts, entry, groupNode) {
  if (!isGroupNode(groupNode) || groupNode === entry.node) return false;
  if (!canUngroup(groupNode)) return false;
  const map = parentMap(parts);
  let p = entry.parent;
  while (p) {
    if (!canUngroup(p)) return false;
    p = map.get(p);
  }
  p = groupNode; // doubles as the cycle check: walking up must not hit the node
  while (p) {
    if (p === entry.node) return false;
    if (!canUngroup(p)) return false;
    p = map.get(p);
  }
  return true;
}

/**
 * The groups a node can be moved into (for a dropdown): every group except
 * its current parent (a no-op) and the ones canMoveInto rejects. The node's
 * id is unique across the tree, so the caller can resolve by id.
 */
export function groupTargets(parts, entry) {
  return listNodes(parts)
    .map((e) => e.node)
    .filter((n) => isGroupNode(n) && n !== entry.parent && canMoveInto(parts, entry, n));
}

/**
 * Move the node at `entry` into the existing group `groupNode`, converting its
 * transform so it stays exactly where it renders (identity scales — callers
 * must guard with canMoveInto). A root leaf first folds y/lift/tilt into the
 * nested field set (rootToNestedTransform); then every node's localPos and
 * rotation are re-expressed in the target group's frame via
 * M = frame(target)⁻¹ · frame(source), so the world placement
 * frameFromRoot · T(localPos) · R is unchanged. Returns the moved node, or
 * null when the move is not allowed.
 */
export function moveIntoGroup(parts, entry, groupNode) {
  if (!canMoveInto(parts, entry, groupNode)) return null;
  const node = entry.node;
  const map = parentMap(parts);
  // A root leaf normalizes to the nested field set first (y/lift/tilt fold in).
  if (entry.parent === null && !isGroupNode(node)) {
    node.transform = rootToNestedTransform(node.transform);
  }
  const t = node.transform ?? (node.transform = {});

  // M = frame(target)⁻¹ · frame(source) — a rigid delta between the two
  // frames; applying it to localPos + rotation preserves the world placement.
  const targetFrame = mat4Multiply(frameFromRoot(map, groupNode), frameMatrix(groupNode.transform ?? {}));
  const sourceFrame = frameFromRoot(map, node);
  const M = mat4Multiply(rigidInverse(targetFrame), sourceFrame);

  const tM = { x: M[12], y: M[13], z: M[14] };
  const rot = rotateVec3(M, { x: t.localPos?.x ?? 0, y: t.localPos?.y ?? 0, z: t.localPos?.z ?? 0 });
  const next = { x: rot.x + tM.x, y: rot.y + tM.y, z: rot.z + tM.z };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;

  // Rotation: R(M) · R(node), composed into one axis/angle. A pure-Y delta on
  // a node without a localAxis stays in rotY — cleaner files. mat4ToAxisAngle
  // may return (axis = −Y, angle = +θ) for a −θ Y rotation; the axis sign
  // picks the rotY direction.
  const { axis, angle } = mat4ToAxisAngle(M);
  if (angle > 1e-9) {
    const hasLocal = t.localAxis && t.localAngle !== undefined;
    const pureY = Math.abs(axis.x) < 1e-6 && Math.abs(axis.y) > 0.99 && Math.abs(axis.z) < 1e-6;
    if (pureY && !hasLocal) {
      t.rotY = (t.rotY ?? 0) + (axis.y > 0 ? angle : -angle);
    } else {
      const composed = mat4Multiply(mat4RotationAxisAngle(axis, angle), nodeRotationMatrix(t));
      const c = mat4ToAxisAngle(composed);
      if (c.angle > 1e-9) {
        t.localAxis = c.axis;
        t.localAngle = c.angle;
      } else {
        delete t.localAxis;
        delete t.localAngle;
      }
      t.rotY = 0;
    }
  }

  siblingList(parts, entry).splice(entry.index, 1);
  groupNode.children.push(node);
  return node;
}

/**
 * Whether the node at `entry` can be moved out of its group exactly — it must
 * be nested, and the group's scale must be identity (the fold is the
 * ungroup math).
 */
export function canExtract(entry) {
  return entry.parent !== null && canUngroup(entry.parent);
}

/**
 * Move the nested node at `entry` out of its group: fold the group's transform
 * into the node (the same math as ungroup, applied to one child) and insert it
 * into the group's parent list, right after the group. The group itself stays
 * put. Returns the node, or null when the move is not allowed.
 */
export function extractNode(parts, entry) {
  if (!canExtract(entry)) return null;
  const node = entry.node;
  const group = entry.parent;
  const map = parentMap(parts);
  const grandList = map.get(group) ? map.get(group).children : parts;
  group.children.splice(entry.index, 1);
  node.transform = foldChildTransform(node.transform ?? {}, group.transform ?? {});
  grandList.splice(grandList.indexOf(group) + 1, 0, node);
  return node;
}
