/**
 * move.js — Reparenting restructure: moving a node into / out of an existing
 * group, or into an alternatives choice point (as a new option) / one of its
 * options, with exact frame conversion (identity scales only — guarded by
 * canMoveInto / canMoveIntoFrame / canExtract).
 */
import { isGroupNode, isAlternativesNode, listNodes, siblingList } from '../walk.js';
import { rootToNestedTransform, nodeRotationMatrix, rotateVec3, freshId, motifScoped } from '../nodes/index.js';
import {
  mat4Identity,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../../../../src/engine/rules/mat4.js';
import { canUngroup } from './nest.js';
import { foldChildTransform, frameMatrix, rigidInverse, parentMap, frameFromRoot } from './frameMath.js';

/** Whether a node is a rigid frame for reparenting: identity-scale groups are,
 *  and alternatives choice points always are (they carry no transform of their
 *  own — their options' parts live in the choice point's parent frame). */
function isRigidFrame(node) {
  return isAlternativesNode(node) || canUngroup(node);
}

/** Whether a rigid (rotation + translation) matrix is the identity. */
function isIdentityRigid(m) {
  const id = mat4Identity();
  for (let i = 0; i < 16; i++) {
    if (Math.abs(m[i] - id[i]) > 1e-9) return false;
  }
  return true;
}

/**
 * Re-express a node's transform (localPos + rotation) into a new frame: the
 * world placement T(localPos) · R is preserved under M = frame(target)⁻¹ ·
 * frame(source). A pure-Y delta on a node without a localAxis stays in rotY —
 * cleaner files; otherwise the rotations compose into one axis/angle. Identity
 * deltas leave the transform untouched.
 */
function reExpressTransform(t, M) {
  const tM = { x: M[12], y: M[13], z: M[14] };
  const rot = rotateVec3(M, { x: t.localPos?.x ?? 0, y: t.localPos?.y ?? 0, z: t.localPos?.z ?? 0 });
  const next = { x: rot.x + tM.x, y: rot.y + tM.y, z: rot.z + tM.z };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;

  // Rotation: R(M) · R(node), composed into one axis/angle. mat4ToAxisAngle
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
}

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
  // Source and target ancestor chains must be rigid. Alternatives choice
  // points count as rigid too (they carry no transform — their options' parts
  // live in the choice point's parent frame), so a part living inside an
  // option can be reparented across choice-point frames exactly.
  for (let p = entry.parent; p; p = map.get(p)) {
    if (!isRigidFrame(p)) return false;
  }
  for (let p = map.get(groupNode); p; p = map.get(p)) {
    if (p === entry.node) return false; // cycle: the group is inside the node
    if (!isRigidFrame(p)) return false;
  }
  // A choice point being moved cannot carry a transform — like canMoveIntoFrame,
  // it may only reparent between identical frames (a rotated group target would
  // make moveIntoGroup return null silently).
  if (isAlternativesNode(entry.node)) {
    const targetFrame = mat4Multiply(frameFromRoot(map, groupNode), frameMatrix(groupNode.transform ?? {}));
    const sourceFrame = frameFromRoot(map, entry.node);
    if (!isIdentityRigid(mat4Multiply(rigidInverse(targetFrame), sourceFrame))) return false;
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
 * Whether the node at `entry` can move into an alternatives choice point's
 * frame — as a new option or into one of its options. Choice points carry no
 * transform, so only the ancestor chains must be rigid (alternatives nodes
 * themselves count as rigid), and the target must not be the node itself or
 * inside its own subtree. When the SOURCE is itself an alternatives node, the
 * frame delta must be identity — a choice point cannot carry a transform, so
 * it can only move between identical frames.
 */
export function canMoveIntoFrame(parts, entry, altNode) {
  if (!isAlternativesNode(altNode) || altNode === entry.node) return false;
  const map = parentMap(parts);
  for (let p = entry.parent; p; p = map.get(p)) {
    if (!isRigidFrame(p)) return false;
  }
  for (let p = map.get(altNode); p; p = map.get(p)) {
    if (p === entry.node) return false; // cycle
    if (!isRigidFrame(p)) return false;
  }
  if (isAlternativesNode(entry.node)) {
    const targetFrame = frameFromRoot(map, altNode);
    const sourceFrame = frameFromRoot(map, entry.node);
    if (!isIdentityRigid(mat4Multiply(rigidInverse(targetFrame), sourceFrame))) return false;
  }
  return true;
}

/**
 * The move targets for the unified "move into…" dropdown: every group, every
 * alternatives choice point (the move becomes a NEW option there), and every
 * option of every eligible choice point (the move inserts into that option's
 * parts). Each entry is { kind: 'group' | 'choice' | 'option', id, node,
 * option } — `option` is the target option for kind 'option', null otherwise.
 * Targets appear in tree order; callers resolve them by array index.
 */
export function moveTargets(parts, entry) {
  const out = [];
  for (const e of listNodes(parts)) {
    const n = e.node;
    if (isGroupNode(n)) {
      if (n !== entry.parent && canMoveInto(parts, entry, n)) {
        out.push({ kind: 'group', id: n.id, node: n, option: null });
      }
    } else if (isAlternativesNode(n) && canMoveIntoFrame(parts, entry, n)) {
      out.push({ kind: 'choice', id: n.id, node: n, option: null });
      for (const opt of n.alternatives) {
        if (opt === entry.option) continue; // its current option — a no-op reorder
        out.push({ kind: 'option', id: opt.id, node: n, option: opt });
      }
    }
  }
  return out;
}

/**
 * Move the node at `entry` into the frame of an alternatives choice point
 * `altNode` — into a specific option (`opt`) or as a brand-new option (null).
 * The transform is re-expressed so the node stays exactly where it renders
 * (identity scales — callers must guard with canMoveIntoFrame). A root leaf
 * first folds y/lift/tilt into the nested field set. Returns the moved node,
 * or null when the move is not allowed.
 */
export function moveIntoOption(parts, entry, altNode, opt = null, motifId = null) {
  if (!canMoveIntoFrame(parts, entry, altNode)) return null;
  const node = entry.node;
  const map = parentMap(parts);
  const isChoice = isAlternativesNode(node);
  if (entry.parent === null && !isGroupNode(node) && !isChoice) {
    node.transform = rootToNestedTransform(node.transform ?? {});
  }
  // The options' parts live in the choice point's parent frame — choice points
  // carry no transform of their own.
  const targetFrame = frameFromRoot(map, altNode);
  const sourceFrame = frameFromRoot(map, node);
  const M = mat4Multiply(rigidInverse(targetFrame), sourceFrame);
  if (isChoice && !isIdentityRigid(M)) return null; // a choice point cannot carry a transform
  if (!isIdentityRigid(M)) {
    const t = node.transform ?? (node.transform = {});
    reExpressTransform(t, M);
  }
  siblingList(parts, entry).splice(entry.index, 1);
  const option = opt ?? { id: freshId(parts, motifScoped(`${altNode.id}-option`, motifId)), weight: 1, parts: [] };
  if (!opt) altNode.alternatives.push(option);
  option.parts.push(node);
  return node;
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
  const isChoice = isAlternativesNode(node);
  // A root leaf normalizes to the nested field set first (y/lift/tilt fold in);
  // choice points skip it — they carry no transform.
  if (entry.parent === null && !isGroupNode(node) && !isChoice) {
    node.transform = rootToNestedTransform(node.transform ?? {});
  }
  const targetFrame = mat4Multiply(frameFromRoot(map, groupNode), frameMatrix(groupNode.transform ?? {}));
  const sourceFrame = frameFromRoot(map, node);
  const M = mat4Multiply(rigidInverse(targetFrame), sourceFrame);
  if (isChoice && !isIdentityRigid(M)) return null; // a choice point cannot carry a transform
  if (!isIdentityRigid(M)) {
    const t = node.transform ?? (node.transform = {});
    reExpressTransform(t, M);
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
