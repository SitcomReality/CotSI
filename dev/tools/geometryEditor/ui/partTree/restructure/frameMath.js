/**
 * frameMath.js — Rigid-frame matrix helpers for tree restructure: folding a
 * group's transform into a child, and the frame-bracket math for exact
 * reparenting (a frame matrix per node, its inverse, and the composition of
 * every ancestor frame). All rigid (translation + rotation only) — reparenting
 * stays exact only with identity scale, which the callers guard (canUngroup /
 * canMoveInto).
 */
import {
  mat4Identity,
  mat4Translation,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../../../../src/engine/rules/mat4.js';
import { listNodes } from '../walk.js';
import { nodeRotationMatrix, rotateVec3 } from '../nodes/transform.js';

/**
 * The transform a child of a group gets when promoted to the group's parent
 * frame (the per-child fold of ungroup / extract): position becomes
 * group.localPos + R(group rotation) · child.localPos (the child's own rotation
 * stays about its own point), and the rotation composes as R(group rotation) ·
 * R(child rotation) into a single axis/angle — the group's rotation wraps the
 * child's. When the group has no rotation, the child's rotation fields are
 * left untouched and its localPos just sums. Returns a new transform object.
 */
export function foldChildTransform(ct, t) {
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
 * A node's transform as a frame matrix in its parent's coordinates:
 * T(localPos) · R(localAxis, localAngle) · R_y(rotY) — the rigid part of the
 * transform (scale excluded: reparenting stays exact only with identity
 * scale, guarded by canUngroup / canMoveInto).
 */
export function frameMatrix(t) {
  return mat4Multiply(
    mat4Translation(t.localPos?.x ?? 0, t.localPos?.y ?? 0, t.localPos?.z ?? 0),
    nodeRotationMatrix(t),
  );
}

/** Inverse of a rigid (rotation + translation) matrix — cheaper than a general inverse. */
export function rigidInverse(m) {
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
export function parentMap(parts) {
  const map = new Map();
  for (const e of listNodes(parts)) map.set(e.node, e.parent);
  return map;
}

/**
 * The frame a node's localPos lives in: every ancestor group's frame composed
 * root-first. The root frame is identity.
 */
export function frameFromRoot(map, node) {
  const chain = [];
  let p = map.get(node);
  while (p) { chain.unshift(p); p = map.get(p); }
  let m = mat4Identity();
  for (const g of chain) m = mat4Multiply(m, frameMatrix(g.transform ?? {}));
  return m;
}
