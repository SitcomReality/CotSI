/**
 * partTree.test.js — Parts-tree walk + nest/ungroup math for the geometry
 * editor (dev/geometryEditor/ui/partTree.js). Pure — no DOM — so it runs in
 * the Node suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listNodes,
  countNodes,
  findNodeById,
  siblingIds,
  freshId,
  isGroupNode,
  rootToNestedTransform,
  nestNode,
  ungroupNode,
  canUngroup,
} from '../../dev/geometryEditor/ui/partTree.js';
import {
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../src/engine/rules/mat4.js';

/** Apply the upper-left 3×3 of a column-major matrix to a vector. */
function rotateVec3(m, v) {
  return {
    x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
    y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
    z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
  };
}

/** Approximate vector comparison — trig entries carry ~1e-16 drift. */
function expectVec3(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) < eps, 'x ' + actual.x + ' vs ' + expected.x);
  assert.ok(Math.abs(actual.y - expected.y) < eps, 'y ' + actual.y + ' vs ' + expected.y);
  assert.ok(Math.abs(actual.z - expected.z) < eps, 'z ' + actual.z + ' vs ' + expected.z);
}

const TREE = [
  { id: 'base', shape: 'sphere', transform: {} },
  {
    id: 'lid',
    transform: { localPos: { x: 0, y: 0.5, z: 0 } },
    children: [
      { id: 'board', shape: 'box', transform: {} },
      { id: 'strap', shape: 'box', transform: {} },
    ],
  },
  { id: 'lock', shape: 'box', transform: {} },
];

// ── Walking ────────────────────────────────────────────────────────────────

test('listNodes walks the tree in render order with depth/parent/index', () => {
  const nodes = listNodes(TREE);
  assert.deepEqual(nodes.map((e) => e.node.id), ['base', 'lid', 'board', 'strap', 'lock']);
  assert.deepEqual(nodes.map((e) => e.depth), [0, 0, 1, 1, 0]);
  assert.deepEqual(nodes.map((e) => e.index), [0, 1, 0, 1, 2]);
  assert.equal(nodes[0].parent, null);
  assert.equal(nodes[2].parent.id, 'lid');
});

test('countNodes totals groups and leaves', () => {
  assert.equal(countNodes(TREE), 5);
  assert.equal(countNodes([{ id: 'a', shape: 'box', transform: {} }]), 1);
});

test('findNodeById resolves nested ids and returns null for missing ones', () => {
  const entry = findNodeById(TREE, 'strap');
  assert.equal(entry.node.id, 'strap');
  assert.equal(entry.parent.id, 'lid');
  assert.equal(entry.depth, 1);
  assert.equal(entry.index, 1);
  assert.equal(findNodeById(TREE, 'nope'), null);
});

test('siblingIds excludes the node itself', () => {
  assert.deepEqual(siblingIds(TREE, findNodeById(TREE, 'base')), ['lid', 'lock']);
  assert.deepEqual(siblingIds(TREE, findNodeById(TREE, 'strap')), ['board']);
  assert.deepEqual(siblingIds(TREE, findNodeById(TREE, 'board')), ['strap']);
});

test('freshId skips ids already in the tree', () => {
  const parts = [
    { id: 'group-1', children: [] },
    { id: 'part-2', shape: 'box', transform: {} },
  ];
  assert.equal(freshId(parts, 'part'), 'part-1');
  assert.equal(freshId(parts, 'part-3'), 'part-3-1', 'prefix is a word, the id is prefix-N');
  assert.equal(freshId(parts, 'group'), 'group-2');
});

test('isGroupNode distinguishes groups from leaves', () => {
  assert.equal(isGroupNode({ children: [] }), true);
  assert.equal(isGroupNode({ shape: 'box' }), false);
});

// ── Root → nested transform conversion (nest) ──────────────────────────────

test('rootToNestedTransform folds y/lift/localPos.y into localPos.y', () => {
  const out = rootToNestedTransform({
    y: 0.4,
    lift: 0.1,
    localPos: { x: 0.2, z: -0.1 },
    rotY: 0.3,
  });
  assert.deepEqual(out.localPos, { x: 0.2, y: 0.5, z: -0.1 });
  assert.equal(out.rotY, 0.3);
  assert.equal(out.scaleX, 1);
  assert.equal(out.scaleY, 1);
  assert.equal(out.scaleZ, 1);
  assert.equal(out.localAxis, undefined, 'no rotation fields when the root had none');
  assert.equal(out.localAngle, undefined);
});

test('rootToNestedTransform keeps a lone localAxis/localAngle rotation', () => {
  const out = rootToNestedTransform({ localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 });
  expectVec3(out.localAxis, { x: 1, y: 0, z: 0 });
  assert.ok(Math.abs(out.localAngle - Math.PI / 2) < 1e-9, 'angle ' + out.localAngle);
  assert.equal(out.rotY, 0, 'rotY folds into the composed rotation');
});

test('rootToNestedTransform folds a world tilt into the parent-frame rotation', () => {
  const out = rootToNestedTransform({
    tiltAxis: { x: 1, z: 0 },
    tilt: 0.6,
  });
  expectVec3(out.localAxis, { x: 1, y: 0, z: 0 });
  assert.ok(Math.abs(out.localAngle - 0.6) < 1e-9, 'angle ' + out.localAngle);
});

test('rootToNestedTransform composes localAxis + rotY + tilt in the flat order', () => {
  const t = {
    localAxis: { x: 0, y: 1, z: 0 },
    localAngle: 0.4,
    rotY: 0.7,
    tiltAxis: { x: 1, z: 0 },
    tilt: 0.6,
  };
  const out = rootToNestedTransform(t);
  // Expected: R_tilt · R_y(rotY) · R_local (local first, tilt last).
  const expected = mat4Multiply(
    mat4RotationAxisAngle({ x: 1, y: 0, z: 0 }, 0.6),
    mat4Multiply(mat4RotationY(0.7), mat4RotationAxisAngle({ x: 0, y: 1, z: 0 }, 0.4)),
  );
  const rebuilt = mat4RotationAxisAngle(out.localAxis, out.localAngle);
  for (let i = 0; i < 16; i++) {
    assert.ok(Math.abs(rebuilt[i] - expected[i]) < 1e-9, 'matrix[' + i + '] ' + rebuilt[i] + ' vs ' + expected[i]);
  }
  assert.equal(out.rotY, 0, 'rotY folds into the composed rotation');
});

// ── Nest ───────────────────────────────────────────────────────────────────

test('nestNode wraps a root leaf in a fresh group, converting its transform', () => {
  const parts = [
    { id: 'a', shape: 'sphere', transform: { y: 0.3, localPos: { x: 0.1, z: 0.2 } } },
    { id: 'b', shape: 'box', transform: {} },
  ];
  const entry = findNodeById(parts, 'a');
  const group = nestNode(parts, entry);
  assert.equal(parts.length, 2, 'the group replaces the leaf at the same index');
  assert.equal(parts[0], group, 'group takes the leaf\'s slot');
  assert.ok(isGroupNode(group));
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0], entry.node);
  assert.equal(parts[1].id, 'b');
  // The leaf's root y/localPos folded into a nested localPos.
  assert.deepEqual(entry.node.transform.localPos, { x: 0.1, y: 0.3, z: 0.2 });
  assert.equal(entry.node.transform.y, undefined, 'root-only fields are gone');
});

test('nestNode on a nested leaf keeps its transform untouched', () => {
  const parts = [{
    id: 'g',
    children: [
      { id: 'c', shape: 'box', transform: { localPos: { x: 0, y: 1, z: 0 }, rotY: 0.5 } },
    ],
  }];
  const child = findNodeById(parts, 'c');
  const group = nestNode(parts, child);
  assert.equal(parts[0].children.length, 1, 'nested group replaces the child in place');
  assert.equal(parts[0].children[0], group);
  assert.deepEqual(child.node.transform, { localPos: { x: 0, y: 1, z: 0 }, rotY: 0.5 }, 'transform unchanged');
});

// ── Ungroup ────────────────────────────────────────────────────────────────

test('canUngroup requires a group with identity scale', () => {
  assert.equal(canUngroup({ id: 'x', shape: 'box', transform: {} }), false, 'leaves cannot ungroup');
  assert.equal(canUngroup({ id: 'g', children: [], transform: {} }), true);
  assert.equal(canUngroup({ id: 'g', children: [], transform: { scaleY: 2 } }), false, 'scaled group cannot ungroup exactly');
  assert.equal(canUngroup({ id: 'g', children: [], transform: { scaleX: 1, scaleY: 1, scaleZ: 1 } }), true);
});

test('ungroupNode with an identity group just sums localPos, keeps rotations', () => {
  const parts = [{
    id: 'g',
    transform: { localPos: { x: 0.1, y: 0.2, z: 0.3 } },
    children: [
      { id: 'a', shape: 'box', transform: { localPos: { x: 0.05, z: -0.1 }, rotY: 0.7 } },
      { id: 'b', shape: 'box', transform: {} },
    ],
  }, { id: 'other', shape: 'sphere', transform: {} }];
  const promoted = ungroupNode(parts, findNodeById(parts, 'g'));
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map((p) => p.id), ['a', 'b', 'other']);
  expectVec3(promoted[0].transform.localPos, { x: 0.15, y: 0.2, z: 0.2 });
  assert.equal(promoted[0].transform.rotY, 0.7, 'rotation untouched');
  expectVec3(promoted[1].transform.localPos, { x: 0.1, y: 0.2, z: 0.3 });
});

test('ungroupNode folds a rotated group into each child (position + rotation)', () => {
  const parts = [{
    id: 'g',
    transform: { localPos: { x: 0, y: 0.5, z: 0 }, rotY: Math.PI / 2 },
    children: [
      { id: 'c', shape: 'box', transform: { localPos: { x: 0, y: 0, z: 1 } } },
    ],
  }];
  const [child] = ungroupNode(parts, findNodeById(parts, 'g'));
  // R_y(π/2) sends +z → +x (this convention): child offset (0,0,1) → (1,0,0),
  // so localPos = groupPos + (1, 0, 0) (z carries ~1e-16 trig drift).
  expectVec3(child.transform.localPos, { x: 1, y: 0.5, z: 0 });
  // The composed rotation is the group's R_y(π/2) — axis +Y, angle π/2, rotY 0.
  expectVec3(child.transform.localAxis, { x: 0, y: 1, z: 0 });
  assert.ok(Math.abs(child.transform.localAngle - Math.PI / 2) < 1e-9, 'angle ' + child.transform.localAngle);
  assert.equal(child.transform.rotY, 0);
});

test('ungroupNode composes group rotation × child rotation exactly', () => {
  const parts = [{
    id: 'g',
    transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 },
    children: [
      { id: 'c', shape: 'box', transform: { localPos: { x: 0, y: 1, z: 0 }, localAxis: { x: 0, y: 1, z: 0 }, localAngle: 0.6 } },
    ],
  }];
  const [child] = ungroupNode(parts, findNodeById(parts, 'g'));
  // Position: the group's rotation (only) rotates the child's offset (0,1,0).
  const gRot = mat4RotationAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2);
  const rotated = rotateVec3(gRot, { x: 0, y: 1, z: 0 });
  expectVec3(child.transform.localPos, { x: rotated.x, y: rotated.y, z: rotated.z });
  // Rotation: R(group) · R(child), collapsed to one axis/angle.
  const cRot = mat4RotationAxisAngle({ x: 0, y: 1, z: 0 }, 0.6);
  const expected = mat4Multiply(gRot, cRot);
  const rebuilt = mat4RotationAxisAngle(child.transform.localAxis, child.transform.localAngle);
  for (let i = 0; i < 16; i++) {
    assert.ok(Math.abs(rebuilt[i] - expected[i]) < 1e-9, 'matrix[' + i + '] ' + rebuilt[i] + ' vs ' + expected[i]);
  }
  assert.equal(child.transform.rotY, 0);
});

test('ungroupNode drops rotation fields when the composition is identity', () => {
  const parts = [{
    id: 'g',
    transform: { rotY: Math.PI }, // 180° — cancels a child's 180° spin
    children: [
      { id: 'c', shape: 'box', transform: { localAxis: { x: 0, y: 1, z: 0 }, localAngle: Math.PI } },
    ],
  }];
  const [child] = ungroupNode(parts, findNodeById(parts, 'g'));
  assert.equal(child.transform.localAxis, undefined);
  assert.equal(child.transform.localAngle, undefined);
  assert.equal(child.transform.rotY, 0);
});
