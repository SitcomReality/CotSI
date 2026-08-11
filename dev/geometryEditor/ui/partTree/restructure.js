import {
  mat4Identity,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Translation,
  mat4Multiply,
} from '../../../../src/engine/rules/mat4.js';
import { isGroupNode, listNodes, siblingList } from './walk.js';
import { freshId, makeGroupNode, rootToNestedTransform, nodeRotationMatrix, rotateVec3 } from './nodes.js';

/**
 * Apply a parent-frame delta to a node's `localPos`, deleting the field when
 * every component returns to 0 (keeps denormalized files free of
 * `localPos: {0,0,0}` noise — the same convention as the inspector's field
 * editor). `t` must already exist; callers create it via
 * `node.transform ?? (node.transform = {})`. Used by the viewport gizmo.
 */
export function addLocalDelta(t, dx, dy, dz) {
  const lp = t.localPos ?? {};
  const next = { x: (lp.x ?? 0) + dx, y: (lp.y ?? 0) + dy, z: (lp.z ?? 0) + dz };
  if (next.x === 0 && next.y === 0 && next.z === 0) delete t.localPos;
  else t.localPos = next;
}

/**
 * Wrap the node at `entry` in a fresh group, preserving its on-screen
 * position: the new group (identity transform) replaces the node in its parent
 * list, and the node becomes the group's only child. A nested node keeps its
 * transform untouched; a ROOT leaf converts to the nested field set via
 * rootToNestedTransform. Returns the new group node.
 */
export function nestNode(parts, entry) {
  const list = siblingList(parts, entry);
  const group = makeGroupNode(freshId(parts, 'group'));
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
 * The transform a child of a group gets when promoted to the group's parent
 * frame (the per-child fold of ungroup / extract): position becomes
 * group.localPos + R(group rotation) · child.localPos (the child's own rotation
 * stays about its own point), and the rotation composes as R(group rotation) ·
 * R(child rotation) into a single axis/angle — the group's rotation wraps the
 * child's. When the group has no rotation, the child's rotation fields are
 * left untouched and its localPos just sums. Returns a new transform object.
 */
function foldChildTransform(ct, t) {
  const gPos = { x: t.localPos?.x ?? 0, y: t.localPos?.y ?? 0, z: t.localPos?.z ?? 0 };
  const gRot = nodeRotationMatrix(t);
  const hasGroupRot =
    (t.localAxis && t.localAngle !== undefined) || !!t.rotY;
  const cPos = { x: ct.localPos?.x ?? 0, y: ct.localPos?.y ?? 0, z: ct.localPos?.z ?? 0 };
  const next = { ...ct };
  if (hasGroupRot) {
    const rotated = rotateVec3(gRot, cPos);
    next.localPos = { x: gPos.x + rotated.x, y: gPos.y + rotated.y, z: gPos.z + rotated.z };
    const composed = mat4Multiply(gRot, nodeRotationMatrix(ct));
    const { axis, angle } = mat4ToAxisAngle(composed);
    if (angle > 1e-9) {
      next.localAxis = axis;
      next.localAngle = angle;
    } else {
      delete next.localAxis;
      delete next.localAngle;
    }
    next.rotY = 0;
  } else {
    next.localPos = { x: gPos.x + cPos.x, y: gPos.y + cPos.y, z: gPos.z + cPos.z };
  }
  return next;
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

// ── Reparenting (move into / out of existing groups) ────────────────────────

/**
 * A node's transform as a frame matrix in its parent's coordinates:
 * T(localPos) · R(localAxis, localAngle) · R_y(rotY) — the rigid part of the
 * transform (scale excluded: reparenting stays exact only with identity
 * scale, guarded by canUngroup / canMoveInto).
 */
function frameMatrix(t) {
  return mat4Multiply(
    mat4Translation(t.localPos?.x ?? 0, t.localPos?.y ?? 0, t.localPos?.z ?? 0),
    nodeRotationMatrix(t),
  );
}

/** Inverse of a rigid (rotation + translation) matrix — cheaper than a general inverse. */
function rigidInverse(m) {
  const out = mat4Identity();
  // Transpose the rotation block.
  out[0] = m[0]; out[4] = m[1]; out[8] = m[2];
  out[1] = m[4]; out[5] = m[5]; out[9] = m[6];
  out[2] = m[8]; out[6] = m[9]; out[10] = m[10];
  const tx = m[12]; const ty = m[13]; const tz = m[14];
  out[12] = -(out[0] * tx + out[4] * ty + out[8] * tz);
  out[13] = -(out[1] * tx + out[5] * ty + out[9] * tz);
  out[14] = -(out[2] * tx + out[6] * ty + out[10] * tz);
  return out;
}

/** node → parent node map for the whole tree. */
function parentMap(parts) {
  const map = new Map();
  for (const e of listNodes(parts)) map.set(e.node, e.parent);
  return map;
}

/**
 * The frame a node's localPos lives in: every ancestor group's frame composed
 * root-first. The root frame is identity.
 */
function frameFromRoot(map, node) {
  const chain = [];
  let p = map.get(node);
  while (p) { chain.unshift(p); p = map.get(p); }
  let m = mat4Identity();
  for (const g of chain) m = mat4Multiply(m, frameMatrix(g.transform ?? {}));
  return m;
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
