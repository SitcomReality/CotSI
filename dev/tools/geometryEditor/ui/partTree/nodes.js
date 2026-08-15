import {
  NESTED_PART_TRANSFORM_DEFAULTS,
  PART_TRANSFORM_DEFAULTS,
  SHAPE_TYPES,
} from '../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  mat4Identity,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../../../src/engine/rules/mat4.js';
import { listNodes } from './walk.js';

/**
 * A fresh node id in the tree: `prefix` + a counter that skips ids already in
 * use (schema: ids must be unique across the whole parts tree).
 */
export function freshId(parts, prefix) {
  const taken = new Set(listNodes(parts).map((e) => e.node.id));
  let n = 1;
  while (taken.has(prefix + '-' + n)) n++;
  return prefix + '-' + n;
}

/** A new group node: identity transform (nested field set) + empty children. */
export function makeGroupNode(id) {
  return {
    id,
    transform: { ...NESTED_PART_TRANSFORM_DEFAULTS },
    children: [],
  };
}

/**
 * A new leaf node of `shape`. Root leaves (nested = false) get the full
 * grounding transform set (y/lift), so they render at the surface — the nested
 * set has no `y`, and recordBuilder's `worldPos.y + t.y` would go NaN without
 * it. Group children (nested = true) get the nested field set instead.
 */
export function makeLeafNode(shape, id, nested = false) {
  return {
    id,
    shape,
    params: { ...SHAPE_TYPES[shape].defaults },
    transform: { ...(nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS) },
    color: 0xffffff,
  };
}

/**
 * A fresh `alternatives` choice point: one option (`<id>-option-1`, weight 1)
 * holding a copy of the selected node(s) the caller wraps — the "convert
 * selection to alternatives" entry. `seed` is assigned ONCE from the reserved
 * 100–199 lane (never recomputed from id/path — renaming or reordering must
 * not reshuffle in-world rolls, decorComposition.md §2.2).
 * @param {string} id - the node's id (unique across the tree)
 * @param {object[]} selectedParts - parts to seed the first option with
 * @param {Set<string>} takenSeeds - seeds already used in this descriptor
 */
export function makeAlternativesNode(id, selectedParts, takenSeeds) {
  let seed = 100;
  while (takenSeeds.has(seed)) seed++;
  takenSeeds.add(seed);
  const optionId = `${id}-option-1`;
  return {
    id,
    seed,
    default: optionId,
    alternatives: [
      { id: optionId, weight: 1, parts: selectedParts },
    ],
  };
}

/** The node's rotation as a column-major matrix: R(localAxis, localAngle) · R_y(rotY). */
export function nodeRotationMatrix(t) {
  let r = mat4Identity();
  if (t.localAxis && t.localAngle !== undefined) {
    r = mat4RotationAxisAngle(t.localAxis, t.localAngle);
  }
  if (t.rotY) r = mat4Multiply(mat4RotationY(t.rotY), r);
  return r;
}

/** Rotate a vector by the upper-left 3×3 of a column-major matrix. */
export function rotateVec3(m, v) {
  return {
    x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
    y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
    z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
  };
}

/**
 * The nested-field transform equivalent of a ROOT leaf's transform — what the
 * leaf becomes when a new identity group wraps it. `y` + `lift` + `localPos.y`
 * fold into `localPos.y` (the bottom stays put: root and nested paths both
 * bottom-anchor). The rotation fields: a lone `localAxis`/`localAngle` or a
 * lone `rotY` carries over untouched (identical matrix, cleaner file); any mix
 * of rotation sources — or a lone world-space `tilt` (nested nodes have no
 * tilt field) — composes into one parent-frame axis/angle in the flat record
 * order (local first, tilt last), because the nested leaf's rotation lives at
 * its localPos point instead of the root pivot.
 */
export function rootToNestedTransform(t) {
  const out = {
    localPos: {
      x: t.localPos?.x ?? 0,
      y: (t.y ?? 0) + (t.lift ?? 0) + (t.localPos?.y ?? 0),
      z: t.localPos?.z ?? 0,
    },
    rotY: t.rotY ?? 0,
    scaleX: t.scaleX ?? 1,
    scaleY: t.scaleY ?? 1,
    scaleZ: t.scaleZ ?? 1,
  };
  const hasLocal = t.localAxis && t.localAngle !== undefined;
  const hasRotY = !!t.rotY;
  const hasTilt = t.tiltAxis && t.tilt !== undefined;
  if (hasLocal && !hasRotY && !hasTilt) {
    out.localAxis = { x: t.localAxis.x, y: t.localAxis.y, z: t.localAxis.z };
    out.localAngle = t.localAngle;
    out.rotY = 0;
  } else if (hasRotY && !hasLocal && !hasTilt) {
    // lone rotY — already set on `out`.
  } else if (hasTilt && !hasLocal && !hasRotY) {
    out.localAxis = { x: t.tiltAxis.x, y: 0, z: t.tiltAxis.z };
    out.localAngle = t.tilt;
    out.rotY = 0;
  } else if (hasLocal || hasRotY || hasTilt) {
    let r = nodeRotationMatrix(t);
    if (hasTilt) {
      r = mat4Multiply(mat4RotationAxisAngle({ x: t.tiltAxis.x, y: 0, z: t.tiltAxis.z }, t.tilt), r);
    }
    const { axis, angle } = mat4ToAxisAngle(r);
    if (angle > 1e-9) {
      out.localAxis = axis;
      out.localAngle = angle;
    }
    out.rotY = 0;
  }
  return out;
}
