/**
 * partTree.js — Parts-tree walk + structural edits for the geometry editor.
 *
 * A descriptor's active parts (activeParts() in variantQuery.js) is a tree of
 * nodes: shape leaves (shape + params) and groups (a `children` array with no
 * shape of their own). These helpers walk that tree — selection resolution,
 * node counts, and the nest/ungroup structural edits — keeping the tree logic
 * out of the row renderers. Pure: no DOM, no editor state, no game state, so
 * the nest/ungroup math is unit-testable in Node.
 *
 * Transform conventions (see schema.js / recordBuilder.js): every node's
 * transform composes as T(localPos) · R(localAxis, localAngle) · R_y(rotY) ·
 * S(scaleX, scaleY, scaleZ) in its parent's frame; root leaves additionally
 * ground with `y`/`lift`/`tilt`. All localPos values are pre-scale units.
 */
import {
  NESTED_PART_TRANSFORM_DEFAULTS,
  SHAPE_TYPES,
} from '../../../src/render/hexmap3d/features/descriptors/schema.js';
import {
  mat4Identity,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../src/engine/rules/mat4.js';

/** A group node — a part with a `children` array and no shape of its own. */
export const isGroupNode = (part) => Array.isArray(part.children);

/**
 * Flat list of every node in a parts tree, in render order. Each entry carries
 * the node plus its tree context: `parent` (null at the root), `depth`, and
 * `index` within the parent's children array (or the root parts array).
 */
export function listNodes(parts) {
  const out = [];
  const walk = (list, parent, depth) => {
    list.forEach((node, index) => {
      out.push({ node, parent, depth, index });
      if (Array.isArray(node.children)) walk(node.children, node, depth + 1);
    });
  };
  walk(parts, null, 0);
  return out;
}

/** Total node count of a parts tree (groups + leaves). */
export function countNodes(parts) {
  let n = 0;
  const walk = (list) => {
    for (const node of list) {
      n++;
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(parts);
  return n;
}

/**
 * Resolve a part id to its tree entry ({ node, parent, depth, index }), or
 * null. Ids are unique across a whole parts tree (schema-validated), so a flat
 * lookup by walking is unambiguous.
 */
export function findNodeById(parts, id) {
  for (const entry of listNodes(parts)) {
    if (entry.node.id === id) return entry;
  }
  return null;
}

/** The sibling array a node sits in (the root parts array at depth 0). */
function siblingList(parts, entry) {
  return entry.parent ? entry.parent.children : parts;
}

/** Ids of a node's siblings (excluding the node itself), in tree order. */
export function siblingIds(parts, entry) {
  return siblingList(parts, entry)
    .filter((n) => n.id !== entry.node.id)
    .map((n) => n.id);
}

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

/** A new leaf node of `shape` with defaults (nested field set — for group children). */
export function makeLeafNode(shape, id) {
  return {
    id,
    shape,
    params: { ...SHAPE_TYPES[shape].defaults },
    transform: { ...NESTED_PART_TRANSFORM_DEFAULTS },
    color: 0xffffff,
  };
}

/** The node's rotation as a column-major matrix: R(localAxis, localAngle) · R_y(rotY). */
function nodeRotationMatrix(t) {
  let r = mat4Identity();
  if (t.localAxis && t.localAngle !== undefined) {
    r = mat4RotationAxisAngle(t.localAxis, t.localAngle);
  }
  if (t.rotY) r = mat4Multiply(mat4RotationY(t.rotY), r);
  return r;
}

/** Rotate a vector by the upper-left 3×3 of a column-major matrix. */
function rotateVec3(m, v) {
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
 * Ungroup the group at `entry`: replace it with its children (in order) in the
 * parent list, folding the group's transform into each child so the visuals
 * stay identical (exact when canUngroup is true — callers must guard).
 *
 * Each child's new localPos = group.localPos + R(group rotation) · child.localPos
 * (the child's own rotation stays about its own point), and its rotation
 * composes as R(group rotation) · R(child rotation) into a single axis/angle —
 * the group's rotation wraps the child's. When the group has no rotation, the
 * child's rotation fields are left untouched. Returns the promoted children.
 */
export function ungroupNode(parts, entry) {
  const group = entry.node;
  const list = siblingList(parts, entry);
  const t = group.transform ?? {};
  const gPos = { x: t.localPos?.x ?? 0, y: t.localPos?.y ?? 0, z: t.localPos?.z ?? 0 };
  const gRot = nodeRotationMatrix(t);
  const hasGroupRot =
    (t.localAxis && t.localAngle !== undefined) || !!t.rotY;

  const folded = group.children.map((child) => {
    const ct = child.transform ?? {};
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
        next.rotY = 0;
      } else {
        delete next.localAxis;
        delete next.localAngle;
        next.rotY = 0;
      }
    } else {
      next.localPos = { x: gPos.x + cPos.x, y: gPos.y + cPos.y, z: gPos.z + cPos.z };
    }
    child.transform = next;
    return child;
  });

  list.splice(entry.index, 1, ...folded);
  return folded;
}
