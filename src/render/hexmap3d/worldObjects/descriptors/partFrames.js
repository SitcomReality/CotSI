/**
 * partFrames.js — Nested part/group frame matrices.
 *
 * The matrix composition for parts trees: a group's frame (offset, orient,
 * scale applied to its children), a nested leaf's baked frame (bottom-anchored
 * like the root record path), the item-level world base, and the
 * rotation-only parent chain the editor's gizmo math needs. Shared by the
 * tile record path (tileRecords.js) and the entity record path
 * (entityRecords.js). Pure — no THREE.
 */
import {
  mat4Translation,
  mat4Scale,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4Multiply,
} from '../../../../engine/rules/mat4.js';
import { shapeBaseOffset } from './shapeTypes.js';
import { leafScaleXYZ } from './partScale.js';
import { stateTransform } from './partStates.js';

/**
 * Pre-scaled localPos of a node. `itemScale` × dispersal × scatter jitter
 * makes the whole item scale rigidly (the same convention as root-leaf
 * localPos/lift — positions move with the geometry); `biomeFactor` keeps
 * per-part biome size changes rigid for nested leaves (groups have no
 * biomeScale — validation rejects it). Roots may use `lift` instead of
 * localPos.y; nested nodes only have localPos.
 */
export function frameLocalPos(t, rigidScale, biomeFactor) {
  if (!t.localPos) return { x: 0, y: 0, z: 0 };
  return {
    x: t.localPos.x * rigidScale * biomeFactor,
    y: t.localPos.y * rigidScale * biomeFactor,
    z: t.localPos.z * rigidScale * biomeFactor,
  };
}

/**
 * A group's frame matrix — how a group offsets, orients, and scales its
 * children: T(localPos) · R_y(rotY) · R(localAxis/localAngle) · S(scale).
 * The group's localPos is pre-scaled by the item's full rigid factor
 * (itemScale × dispersal × scatter jitter), the same factor its children's
 * own geometry and localPos carry — so the group's offsets move rigidly with
 * the item. The group's S carries ONLY the group's own authored scale: its
 * children already scale by the rigid factor themselves, and folding it in
 * again would square it (nested geometry = itemScale²).
 */
export function groupFrameMatrix(t, itemScale, scaleMul, jitterScale) {
  const { x, y, z } = frameLocalPos(t, itemScale * scaleMul * jitterScale, 1);
  const sx = t.scaleX;
  const sy = t.scaleY;
  const sz = t.scaleZ;
  let m = mat4Scale(sx, sy, sz);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * A nested leaf's frame matrix — the leaf's own T(localPos) · R_y(rotY) ·
 * R(localAxis/localAngle) · S(scale), with the full scale factor set (stretch,
 * scatter jitter, biome factor). The recordBuilder composes it onto the
 * ancestor frames to bake the leaf's world matrix. Bottom-anchored like the
 * root record path: the shape's base offset (scaled by this leaf's full Y
 * scale) is baked into the frame AFTER the scale but BEFORE the rotations, so
 * the lowest vertex cancels exactly to the leaf's localPos point — a nested
 * leaf's localPos.y is its bottom height in the parent's frame, matching what
 * `y` means at the root.
 */
export function nestedLeafFrameMatrix(part, descriptor, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor, canonical = false, growth) {
  const t = stateTransform(part, growth);
  const { sx, sy, sz } = leafScaleXYZ(descriptor, part, tile, tileH, i, itemScale, scaleMul, jitterScale, biomeFactor, canonical, growth);
  const { x, y, z } = frameLocalPos(t, itemScale * scaleMul * jitterScale, biomeFactor);
  const base = shapeBaseOffset(part.shape, part.params);
  let m = mat4Scale(sx, sy, sz);
  m = mat4Multiply(mat4Translation(0, base * sy, 0), m);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * The item-level world transform nested leaves sit under — the same slot a
 * root leaf's world rotation occupies: T(placement offset + displacement
 * offset) · R(tilt) · R(rotY), matching meshBuilder's
 * `T · R(tilt) · R(rotY) · …` composition order.
 */
export function worldBaseMatrix(worldPos, placement, disp) {
  const px = worldPos.x + placement.dx;
  const py = worldPos.y + (disp?.yOffset ?? 0);
  const pz = worldPos.z + placement.dz;
  // T · R(tilt) · R(rotY) — the translation is the OUTERMOST transform, so
  // rotY/tilt spin the item about its own origin, exactly like the root-leaf
  // record path (meshBuilder's T(x,z) · R(tilt)·R(rotY) · …). Composing
  // R · T instead would rotate the placement offset about the WORLD origin,
  // displacing nested parts (a scatter item's ring offset swung around the
  // hex center by its per-tile rotY).
  let m = mat4Translation(px, py, pz);
  if (placement.tiltAxis && placement.tilt !== undefined) {
    m = mat4Multiply(m, mat4RotationAxisAngle({ x: placement.tiltAxis.x, y: 0, z: placement.tiltAxis.z }, placement.tilt));
  }
  if (placement.rotY) m = mat4Multiply(m, mat4RotationY(placement.rotY));
  return m;
}

/**
 * The rotation-only part of a composed matrix — worldBase × accumulated
 * ancestor frames with the translation zeroed. The editor converts gizmo drag
 * deltas into a node's local frame with the transpose (a rotation's inverse).
 */
export function parentRotationMatrix(worldBase, frame) {
  const m = mat4Multiply(worldBase, frame);
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  return m;
}
