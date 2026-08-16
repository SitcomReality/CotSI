/**
 * partTree.test.js — Parts-tree walk + nest/ungroup math for the geometry
 * editor (dev/tools/geometryEditor/ui/partTree/). Pure — no DOM — so it runs in
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
  motifScoped,
  isGroupNode,
  makeLeafNode,
  makeAlternativesNode,
  rootToNestedTransform,
  nestNode,
  ungroupNode,
  canUngroup,
  canMoveInto,
  groupTargets,
  moveIntoGroup,
  canMoveIntoFrame,
  moveTargets,
  moveIntoOption,
  duplicateNode,
  duplicateInList,
  canExtract,
  extractNode,
} from '../../../dev/tools/geometryEditor/ui/partTree/index.js';
import {
  NESTED_PART_TRANSFORM_DEFAULTS,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  mat4Identity,
  mat4Translation,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4ToAxisAngle,
  mat4Multiply,
} from '../../../src/engine/rules/mat4.js';

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

test('makeLeafNode seeds root vs nested transform defaults', () => {
  const root = makeLeafNode('box', 'p1');
  assert.equal(root.transform.y, 0, 'root leaves ground — recordBuilder reads t.y');
  assert.equal(root.transform.lift, 0);
  const nested = makeLeafNode('box', 'p2', true);
  assert.equal(nested.transform.y, undefined, 'nested leaves use the nested field set');
  assert.deepEqual(nested.transform, NESTED_PART_TRANSFORM_DEFAULTS, 'no y/lift in nested sets');
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

// ── Reparenting (move into / out of groups) ─────────────────────────────────

/** Editor frame convention: T(localPos) · R(localAxis, angle) · R_y(rotY). */
function nodeFrame(t) {
  let r = mat4Identity();
  if (t.localAxis && t.localAngle !== undefined) r = mat4RotationAxisAngle(t.localAxis, t.localAngle);
  if (t.rotY) r = mat4Multiply(mat4RotationY(t.rotY), r);
  return mat4Multiply(mat4Translation(t.localPos?.x ?? 0, t.localPos?.y ?? 0, t.localPos?.z ?? 0), r);
}

/** World placement of a node: ancestor frames composed root-first, then its own. */
function worldFrame(parts, node) {
  const parents = new Map();
  for (const e of listNodes(parts)) parents.set(e.node, e.parent);
  const chain = [];
  let p = parents.get(node);
  while (p) { chain.unshift(p); p = parents.get(p); }
  let m = mat4Identity();
  for (const g of chain) m = mat4Multiply(m, nodeFrame(g.transform ?? {}));
  return mat4Multiply(m, nodeFrame(node.transform ?? {}));
}

/** Elementwise matrix comparison (trig entries carry ~1e-16 drift). */
function expectMat4(actual, expected, eps = 1e-9) {
  for (let i = 0; i < 16; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) < eps, `m[${i}] ${actual[i]} vs ${expected[i]}`);
  }
}

test('groupTargets lists eligible groups, excluding self-subtree, parent and scaled groups', () => {
  const parts = [
    { id: 'a', shape: 'box', transform: {} },
    { id: 'gOuter', transform: {}, children: [
      { id: 'gInner', transform: {}, children: [
        { id: 'c', shape: 'box', transform: {} },
      ] },
    ] },
    { id: 'gScaled', transform: { scaleZ: 2 }, children: [] },
  ];
  // A root leaf can enter any rigid group, including nested ones.
  assert.deepEqual(groupTargets(parts, findNodeById(parts, 'a')).map((g) => g.id), ['gOuter', 'gInner']);
  // A nested node cannot re-enter its current parent, but can move to a
  // grandparent (gOuter is an ancestor, not a subtree — no cycle).
  assert.deepEqual(groupTargets(parts, findNodeById(parts, 'c')).map((g) => g.id), ['gOuter']);
  // A group cannot be moved into its own subtree (cycle).
  assert.deepEqual(groupTargets(parts, findNodeById(parts, 'gOuter')).map((g) => g.id), []);
  // gInner's only non-scaled relative is its parent gOuter — excluded as a no-op.
  assert.deepEqual(groupTargets(parts, findNodeById(parts, 'gInner')).map((g) => g.id), []);
  // Scaled groups are never a target.
  assert.ok(!canMoveInto(parts, findNodeById(parts, 'a'), findNodeById(parts, 'gScaled').node));
});

test('moveIntoGroup of a root leaf into an identity group equals nestNode', () => {
  const parts = [
    { id: 'a', shape: 'box', transform: { y: 0.4, localPos: { x: 0.1, z: 0.2 }, rotY: 0.3 } },
    { id: 'g', transform: {}, children: [] },
  ];
  const a = findNodeById(parts, 'a');
  const moved = moveIntoGroup(parts, a, findNodeById(parts, 'g').node);
  assert.equal(moved, a.node);
  assert.deepEqual(parts.map((p) => p.id), ['g'], 'the leaf leaves the root list');
  assert.deepEqual(parts[0].children.map((x) => x.id), ['a']);
  // Identity target → no frame delta: exactly what nestNode would produce.
  assert.deepEqual(a.node.transform, rootToNestedTransform({ y: 0.4, localPos: { x: 0.1, z: 0.2 }, rotY: 0.3 }));
});

test('moveIntoGroup of a root leaf into a rotated group preserves its placement', () => {
  const parts = [
    { id: 'a', shape: 'box', transform: { y: 0.2, localPos: { x: 0.5, z: 0 }, rotY: 0.4 } },
    { id: 'g', transform: { localPos: { x: 1, y: 0, z: 0 }, rotY: Math.PI / 2 }, children: [] },
  ];
  const a = findNodeById(parts, 'a');
  // Where the leaf would sit wrapped in an identity group (nestNode contract).
  const expected = nodeFrame(rootToNestedTransform(a.node.transform));
  moveIntoGroup(parts, a, findNodeById(parts, 'g').node);
  expectMat4(worldFrame(parts, a.node), expected);
  // Concrete values: localPos (0.5, 0.2, 0) − (1, 0, 0) = (−0.5, 0.2, 0),
  // counter-rotated by R_y(−π/2) → (0, 0.2, −0.5); the lone rotY absorbs the
  // pure-Y delta: 0.4 + (−π/2).
  expectVec3(a.node.transform.localPos, { x: 0, y: 0.2, z: -0.5 });
  assert.ok(Math.abs(a.node.transform.rotY - (0.4 - Math.PI / 2)) < 1e-9, 'rotY ' + a.node.transform.rotY);
  assert.equal(a.node.transform.localAxis, undefined);
  assert.equal(a.node.transform.y, undefined, 'root-only fields folded away');
});

test('moveIntoGroup between rotated sibling groups preserves the placement', () => {
  const parts = [
    { id: 'g1', transform: { rotY: Math.PI / 2 }, children: [
      { id: 'c', shape: 'box', transform: { localPos: { x: 1, y: 0, z: 0 }, rotY: 0.5 } },
    ] },
    { id: 'g2', transform: { localPos: { x: 0, y: 0, z: 2 } }, children: [] },
  ];
  const c = findNodeById(parts, 'c');
  const before = worldFrame(parts, c.node);
  moveIntoGroup(parts, c, findNodeById(parts, 'g2').node);
  expectMat4(worldFrame(parts, c.node), before, 1e-6);
  assert.deepEqual(findNodeById(parts, 'g2').node.children.map((x) => x.id), ['c']);
  assert.deepEqual(findNodeById(parts, 'g1').node.children, [], 'source group emptied');
});

test('moveIntoGroup can reparent a whole group into another group', () => {
  const parts = [
    { id: 'g1', transform: { localPos: { x: 3, y: 1, z: 0 }, rotY: 0.7 }, children: [] },
    { id: 'g2', transform: { localPos: { x: 0, y: 0, z: 5 }, rotY: -0.3 }, children: [] },
  ];
  const g1 = findNodeById(parts, 'g1');
  const before = worldFrame(parts, g1.node);
  moveIntoGroup(parts, g1, findNodeById(parts, 'g2').node);
  expectMat4(worldFrame(parts, g1.node), before);
  assert.deepEqual(parts.map((p) => p.id), ['g2']);
  assert.deepEqual(parts[0].children.map((x) => x.id), ['g1']);
});

test('moveIntoGroup rejects cycles and scaled frames', () => {
  const parts = [
    { id: 'gOuter', transform: {}, children: [
      { id: 'gInner', transform: {}, children: [] },
    ] },
  ];
  // Into own subtree → cycle.
  assert.equal(moveIntoGroup(parts, findNodeById(parts, 'gOuter'), findNodeById(parts, 'gInner').node), null);
  // Into itself.
  assert.equal(moveIntoGroup(parts, findNodeById(parts, 'gOuter'), findNodeById(parts, 'gOuter').node), null);
  // Into a scaled group.
  const scaled = [
    { id: 'a', shape: 'box', transform: {} },
    { id: 'g', transform: { scaleX: 2 }, children: [] },
  ];
  assert.equal(moveIntoGroup(scaled, findNodeById(scaled, 'a'), findNodeById(scaled, 'g').node), null);
  // A nested node under a scaled parent cannot move anywhere either.
  const nestedInScaled = [
    { id: 'g', transform: { scaleY: 2 }, children: [{ id: 'c', shape: 'box', transform: {} }] },
    { id: 'g2', transform: {}, children: [] },
  ];
  assert.equal(canMoveInto(nestedInScaled, findNodeById(nestedInScaled, 'c'), findNodeById(nestedInScaled, 'g2').node), false);
});

test('extractNode pulls one child out of a rotated group, preserving placement', () => {
  const parts = [{
    id: 'g',
    transform: { localPos: { x: 0, y: 0.5, z: 0 }, rotY: Math.PI / 2 },
    children: [
      { id: 'c', shape: 'box', transform: { localPos: { x: 0, y: 0, z: 1 }, rotY: 0.2 } },
      { id: 'd', shape: 'box', transform: { localPos: { x: 0, y: 0.3, z: 0 } } },
    ],
  }];
  const c = findNodeById(parts, 'c');
  const before = worldFrame(parts, c.node);
  const moved = extractNode(parts, c);
  assert.equal(moved, c.node);
  assert.deepEqual(parts.map((p) => p.id), ['g', 'c'], 'the child lands right after its group');
  assert.deepEqual(findNodeById(parts, 'g').node.children.map((x) => x.id), ['d'], 'the group keeps its other children');
  expectMat4(worldFrame(parts, c.node), before);
});

test('extractNode refuses root nodes and scaled groups', () => {
  const parts = [{ id: 'root', shape: 'box', transform: {} }];
  assert.equal(extractNode(parts, findNodeById(parts, 'root')), null);
  assert.equal(canExtract(findNodeById(parts, 'root')), false);
  const scaled = [{
    id: 'g', transform: { scaleY: 2 }, children: [
      { id: 'c', shape: 'box', transform: {} },
    ],
  }];
  assert.equal(canExtract(findNodeById(scaled, 'c')), false);
  assert.equal(extractNode(scaled, findNodeById(scaled, 'c')), null);
});

// ── Alternatives nodes (v6 decor composition, decorComposition.md §6.2) ─────

test('listNodes walks alternatives nodes and their option subtrees', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder' },
    {
      id: 'arms', seed: 101, default: 'two',
      alternatives: [
        { id: 'none', weight: 0.25, parts: [] },
        { id: 'one', weight: 0.3, parts: [{ id: 'arm-a', shape: 'cylinder' }] },
        { id: 'two', weight: 0.3, parts: [{ id: 'arm-b', shape: 'cylinder' }, { id: 'arm-c', shape: 'cylinder' }] },
      ],
    },
  ];
  const entries = listNodes(parts);
  const ids = entries.map((e) => e.node.id);
  // Options themselves are not nodes — their PARTS recurse beneath the choice
  // point, tagged with the owning option + choice node for the editor.
  assert.deepEqual(ids, ['trunk', 'arms', 'arm-a', 'arm-b', 'arm-c']);
  const armB = entries.find((e) => e.node.id === 'arm-b');
  assert.equal(armB.option.id, 'two');
  assert.equal(armB.choiceId, 'arms');
  assert.equal(entries.find((e) => e.node.id === 'arm-a').option.id, 'one');
  // findNodeById reaches option parts; countNodes counts them.
  assert.equal(findNodeById(parts, 'arm-c').option.id, 'two');
  assert.equal(countNodes(parts), 5);
  // siblingList routes to the owning option's parts (arm-a is alone in its
  // option; arm-b/arm-c share the 'two' option).
  assert.deepEqual(siblingIds(parts, entries.find((e) => e.node.id === 'arm-a')), []);
  assert.deepEqual(siblingIds(parts, entries.find((e) => e.node.id === 'arm-b')), ['arm-c']);
});

test('makeAlternativesNode assigns a fresh seed from the reserved 100–199 lane', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder' },
    { id: 'arms', seed: 100, alternatives: [{ id: 'x', weight: 1, parts: [] }] },
  ];
  const taken = new Set();
  for (const e of listNodes(parts)) if (e.node.seed !== undefined) taken.add(e.node.seed);
  const choice = makeAlternativesNode('crown-choice', [{ id: 'crown-copy', shape: 'sphere' }], taken);
  assert.equal(choice.seed, 101, 'skips the taken seed 100');
  assert.equal(choice.default, 'crown-choice-option-1');
  assert.deepEqual(choice.alternatives[0].parts.map((p) => p.id), ['crown-copy']);
});

test('motifScoped scopes fresh-id stems under the active motif (storage ids, §6.2)', () => {
  // Bare stems get the motif prefix — spec M/localId.
  assert.equal(motifScoped('part', 'cactus'), 'cactus-part');
  assert.equal(freshId([], motifScoped('part', 'cactus')), 'cactus-part-1');
  // Option-internal parts carry M/A — spec M/A/localId.
  assert.equal(motifScoped('two-straight-part', 'cactus'), 'cactus-two-straight-part');
  // Already-prefixed stems pass through (hand-authored `cactus-trunk` stays
  // `cactus-trunk` when wrapped into a choice point — no double prefix).
  assert.equal(motifScoped('cactus-trunk', 'cactus'), 'cactus-trunk');
  assert.equal(motifScoped('cactus-arms-choice', 'cactus'), 'cactus-arms-choice');
  // Outside motif decors the stem is verbatim.
  assert.equal(motifScoped('part', null), 'part');
  assert.equal(motifScoped('group', undefined), 'group');
});

// ── Move into alternatives (choice points / options) ───────────────────────

test('moveTargets lists choice points (as new option) and their options, in tree order', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder', transform: {} },
    {
      id: 'arms', seed: 101, default: 'two',
      alternatives: [
        { id: 'none', weight: 0.25, parts: [] },
        { id: 'two', weight: 0.3, parts: [{ id: 'arm-b', shape: 'cylinder', transform: {} }] },
      ],
    },
  ];
  const targets = moveTargets(parts, findNodeById(parts, 'trunk'));
  assert.deepEqual(targets.map((t) => t.kind), ['choice', 'option', 'option']);
  assert.equal(targets[0].node.id, 'arms');
  assert.equal(targets[1].option.id, 'none');
  assert.equal(targets[2].option.id, 'two');
  // A group target joins the list when one exists.
  const withGroup = [
    { id: 'trunk', shape: 'cylinder', transform: {} },
    { id: 'g', transform: {}, children: [] },
    { id: 'arms', seed: 101, default: 'two', alternatives: [{ id: 'two', weight: 1, parts: [] }] },
  ];
  const gTargets = moveTargets(withGroup, findNodeById(withGroup, 'trunk'));
  assert.deepEqual(gTargets.map((t) => t.kind), ['group', 'choice', 'option']);
});

test('canMoveIntoFrame rejects moving a group into an option of its own subtree (cycle)', () => {
  const parts = [
    { id: 'g', transform: {}, children: [
      { id: 'c', seed: 100, default: 'o1', alternatives: [{ id: 'o1', weight: 1, parts: [] }] },
    ] },
  ];
  const g = findNodeById(parts, 'g');
  const c = findNodeById(parts, 'c');
  assert.equal(canMoveIntoFrame(parts, g, c.node), false, 'choice point is inside the node');
  assert.equal(moveIntoOption(parts, g, c.node, c.node.alternatives[0]), null);
  assert.equal(canMoveIntoFrame(parts, c, c.node), false, 'target is the node itself');
});

test('moveIntoOption moves a root leaf into an existing option (identity frame)', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder', transform: { y: 0.2, localPos: { x: 0.1, z: 0 }, rotY: 0.3 } },
    { id: 'arms', seed: 101, default: 'two', alternatives: [{ id: 'two', weight: 1, parts: [] }] },
  ];
  const trunk = findNodeById(parts, 'trunk');
  const arms = findNodeById(parts, 'arms');
  const optTwo = arms.node.alternatives[0];
  const moved = moveIntoOption(parts, trunk, arms.node, optTwo);
  assert.equal(moved, trunk.node);
  assert.deepEqual(parts.map((p) => p.id), ['arms'], 'the leaf leaves the root list');
  assert.deepEqual(optTwo.parts.map((p) => p.id), ['trunk']);
  // Identity delta → the transform is exactly the root→nested fold.
  assert.deepEqual(trunk.node.transform, rootToNestedTransform({ y: 0.2, localPos: { x: 0.1, z: 0 }, rotY: 0.3 }));
});

test('moveIntoOption with no option creates a fresh weighted option holding the node', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder', transform: { y: 0.2 } },
    { id: 'arms', seed: 101, default: 'two', alternatives: [{ id: 'two', weight: 1, parts: [] }] },
  ];
  const trunk = findNodeById(parts, 'trunk');
  const arms = findNodeById(parts, 'arms');
  const moved = moveIntoOption(parts, trunk, arms.node, null);
  assert.equal(moved, trunk.node);
  assert.equal(arms.node.alternatives.length, 2);
  const fresh = arms.node.alternatives[1];
  assert.equal(fresh.weight, 1);
  assert.ok(fresh.id.startsWith('arms-option-'), 'fresh option id ' + fresh.id);
  assert.deepEqual(fresh.parts.map((p) => p.id), ['trunk']);
  assert.deepEqual(parts.map((p) => p.id), ['arms']);
});

test('moveIntoOption between rotated frames preserves the world placement', () => {
  const parts = [
    {
      id: 'g1', transform: { rotY: Math.PI / 2 }, children: [
        { id: 'c', shape: 'box', transform: { localPos: { x: 1, y: 0, z: 0 }, rotY: 0.5 } },
      ],
    },
    {
      id: 'arms', seed: 101, default: 'two',
      alternatives: [{ id: 'two', weight: 1, parts: [] }],
    },
  ];
  const c = findNodeById(parts, 'c');
  const arms = findNodeById(parts, 'arms');
  const before = worldFrame(parts, c.node);
  moveIntoOption(parts, c, arms.node, arms.node.alternatives[0]);
  expectMat4(worldFrame(parts, c.node), before, 1e-6);
  assert.deepEqual(findNodeById(parts, 'g1').node.children, [], 'source group emptied');
  assert.deepEqual(arms.node.alternatives[0].parts.map((p) => p.id), ['c']);
});

test('a choice point moves only between identical frames — never gains a transform', () => {
  // Identical frames (both at root): the move succeeds and writes no transform.
  const same = [
    { id: 'inner', seed: 100, default: 'o', alternatives: [{ id: 'o', weight: 1, parts: [] }] },
    { id: 'outer', seed: 101, default: 'o2', alternatives: [{ id: 'o2', weight: 1, parts: [] }] },
  ];
  const inner = findNodeById(same, 'inner');
  const outer = findNodeById(same, 'outer');
  assert.equal(canMoveIntoFrame(same, inner, outer.node), true);
  const moved = moveIntoOption(same, inner, outer.node, outer.node.alternatives[0]);
  assert.equal(moved, inner.node);
  assert.equal(inner.node.transform, undefined, 'a choice point never gains a transform');
  assert.deepEqual(outer.node.alternatives[0].parts.map((p) => p.id), ['inner']);

  // Rotated source frame → the delta is non-identity → refused.
  const rotated = [
    { id: 'g', transform: { rotY: Math.PI / 2 }, children: [
      { id: 'inner2', seed: 100, default: 'o', alternatives: [{ id: 'o', weight: 1, parts: [] }] },
    ] },
    { id: 'outer2', seed: 101, default: 'o2', alternatives: [{ id: 'o2', weight: 1, parts: [] }] },
  ];
  const inner2 = findNodeById(rotated, 'inner2');
  const outer2 = findNodeById(rotated, 'outer2');
  assert.equal(canMoveIntoFrame(rotated, inner2, outer2.node), false);
  assert.equal(moveIntoOption(rotated, inner2, outer2.node, outer2.node.alternatives[0]), null);
});

test('moveIntoGroup of a root choice point into an identity group writes no transform', () => {
  // Regression: this used to crash (rootToNestedTransform(undefined)) — a
  // choice point carries no transform, so an identity frame delta is a no-op.
  const parts = [
    { id: 'arms', seed: 100, default: 'o', alternatives: [{ id: 'o', weight: 1, parts: [{ id: 'leaf', shape: 'box', transform: {} }] }] },
    { id: 'g', transform: {}, children: [] },
  ];
  const arms = findNodeById(parts, 'arms');
  const moved = moveIntoGroup(parts, arms, findNodeById(parts, 'g').node);
  assert.equal(moved, arms.node);
  assert.equal(arms.node.transform, undefined, 'no transform lands on the choice point');
  assert.deepEqual(findNodeById(parts, 'g').node.children.map((x) => x.id), ['arms']);
});

// ── Duplicate (part / group / alternatives) ────────────────────────────────

test('duplicateInList copies a leaf with a fresh id, inserted right after it', () => {
  const parts = [
    { id: 'a', shape: 'sphere', transform: { y: 0.3, localPos: { x: 0.1, z: 0.2 } }, color: 0x112233 },
    { id: 'b', shape: 'box', transform: {} },
  ];
  const copy = duplicateInList(parts, parts, 0);
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map((p) => p.id), ['a', 'a-copy-1', 'b']);
  assert.notEqual(copy, parts[0]);
  assert.deepEqual(copy.transform, { y: 0.3, localPos: { x: 0.1, z: 0.2 } }, 'properties copied verbatim');
  assert.equal(copy.color, 0x112233);
  assert.deepEqual(parts[0].transform, { y: 0.3, localPos: { x: 0.1, z: 0.2 } }, 'original untouched');
});

test('duplicateNode re-ids the whole subtree; the copy is independent', () => {
  const parts = [{
    id: 'g',
    transform: { localPos: { x: 0, y: 0.5, z: 0 } },
    children: [
      { id: 'a', shape: 'box', transform: { localPos: { x: 0.1, z: 0 } } },
      { id: 'b', shape: 'box', transform: { localPos: { x: 0.2, z: 0 } } },
    ],
  }];
  const copy = duplicateNode(parts, parts[0]);
  assert.equal(copy.id, 'g-copy-1');
  assert.deepEqual(copy.children.map((c) => c.id), ['a-copy-1', 'b-copy-1']);
  assert.notEqual(copy.children[0], parts[0].children[0], 'deep copy, not a shared reference');
  assert.equal(copy.transform.localPos.y, 0.5);
  assert.deepEqual(parts[0].children.map((c) => c.id), ['a', 'b'], 'original ids untouched');
});

test('duplicateNode on a choice point re-ids options, fixes default, bumps the seed', () => {
  const parts = [
    { id: 'arms', seed: 100, default: 'two', alternatives: [
      { id: 'none', weight: 0.25, parts: [] },
      { id: 'two', weight: 0.3, parts: [{ id: 'arm-b', shape: 'cylinder', transform: {} }] },
    ] },
    { id: 'other', shape: 'sphere', transform: {} },
  ];
  const copy = duplicateNode(parts, parts[0]);
  assert.equal(copy.id, 'arms-copy-1');
  assert.equal(copy.seed, 101, 'fresh seed — the duplicate rolls independently');
  assert.deepEqual(copy.alternatives.map((o) => o.id), ['none-copy-1', 'two-copy-1']);
  assert.equal(copy.default, 'two-copy-1', 'default follows the renamed option');
  assert.deepEqual(copy.alternatives[1].parts.map((p) => p.id), ['arm-b-copy-1']);
  assert.equal(copy.alternatives[0].weight, 0.25, 'weights copied verbatim');
  assert.equal(parts[0].seed, 100, 'original seed untouched');
  assert.equal(parts[0].default, 'two', 'original default untouched');
});

test('duplicateNode skips ids already taken in the tree', () => {
  const parts = [
    { id: 'a', shape: 'box', transform: {} },
    { id: 'a-copy-1', shape: 'box', transform: {} },
  ];
  assert.equal(duplicateNode(parts, parts[0]).id, 'a-copy-2');
});

test('duplicateInList inside an option keeps the copy in the same option', () => {
  const parts = [
    { id: 'arms', seed: 100, default: 'two', alternatives: [
      { id: 'two', weight: 1, parts: [{ id: 'arm-b', shape: 'cylinder', transform: {} }] },
    ] },
  ];
  const opt = parts[0].alternatives[0];
  const copy = duplicateInList(parts, opt.parts, 0);
  assert.deepEqual(opt.parts.map((p) => p.id), ['arm-b', 'arm-b-copy-1']);
  assert.equal(copy.id, 'arm-b-copy-1');
});

test('a part inside an option can move into a group (choice-point frames are rigid)', () => {
  const parts = [
    {
      id: 'arms', seed: 100, default: 'two',
      alternatives: [
        { id: 'two', weight: 1, parts: [{ id: 'arm', shape: 'cylinder', transform: { localPos: { x: 0.1, z: 0 } } }] },
      ],
    },
    { id: 'g', transform: {}, children: [] },
  ];
  const arm = findNodeById(parts, 'arm');
  const before = worldFrame(parts, arm.node);
  const moved = moveIntoGroup(parts, arm, findNodeById(parts, 'g').node);
  assert.equal(moved, arm.node);
  assert.deepEqual(parts[0].alternatives[0].parts, [], 'option emptied');
  assert.deepEqual(findNodeById(parts, 'g').node.children.map((x) => x.id), ['arm']);
  expectMat4(worldFrame(parts, arm.node), before, 1e-6);
});

test('moveIntoOption composes rootToNestedTransform with a rotated target frame', () => {
  // Root leaf with y/lift/tilt, moved into an option of a choice point that
  // sits inside a rotated group: the fold happens first, then the re-expression.
  const parts = [
    { id: 'trunk', shape: 'cylinder', transform: { y: 0.4, lift: 0.1, localPos: { x: 0.2, z: 0 }, rotY: 0.3 } },
    {
      id: 'g', transform: { localPos: { x: 1, y: 0, z: 0 }, rotY: Math.PI / 2 }, children: [
        { id: 'arms', seed: 100, default: 'two', alternatives: [{ id: 'two', weight: 1, parts: [] }] },
      ],
    },
  ];
  const trunk = findNodeById(parts, 'trunk');
  const arms = findNodeById(parts, 'arms');
  // The invariant the move preserves: the world placement stays equal to the
  // leaf's folded root placement (the fold itself is the nestNode contract;
  // the re-expression then absorbs the rotated target frame).
  const folded = rootToNestedTransform({ y: 0.4, lift: 0.1, localPos: { x: 0.2, z: 0 }, rotY: 0.3 });
  const expected = nodeFrame(folded);
  moveIntoOption(parts, trunk, arms.node, arms.node.alternatives[0]);
  expectMat4(worldFrame(parts, trunk.node), expected, 1e-6);
  assert.equal(trunk.node.transform.y, undefined, 'root-only fields folded away');
});

test('duplicateNode keeps stems unique when ids share the -copy pattern', () => {
  const parts = [
    { id: 'a', shape: 'box', transform: {} },
    { id: 'a-copy-1', shape: 'box', transform: {} },
  ];
  // Copying 'a-copy-1' — its stem 'a-copy-1-copy' cannot collide with 'a-copy-1'.
  assert.equal(duplicateNode(parts, parts[1]).id, 'a-copy-1-copy-1');
  // And copying 'a' still skips the existing 'a-copy-1'.
  assert.equal(duplicateNode(parts, parts[0]).id, 'a-copy-2');
});

test('canMoveInto refuses a rotated group target for a root choice point', () => {
  const parts = [
    { id: 'inner', seed: 100, default: 'o', alternatives: [{ id: 'o', weight: 1, parts: [] }] },
    { id: 'g', transform: {}, children: [] },
  ];
  // Identity frame → allowed (the move writes no transform).
  assert.equal(canMoveInto(parts, findNodeById(parts, 'inner'), findNodeById(parts, 'g').node), true);
  // Rotated group frame → the choice point would need a transform it cannot
  // carry, so the target is not offered (and the move refuses).
  const rotated = [
    { id: 'inner2', seed: 100, default: 'o', alternatives: [{ id: 'o', weight: 1, parts: [] }] },
    { id: 'g2', transform: { rotY: Math.PI / 2 }, children: [] },
  ];
  const inner2 = findNodeById(rotated, 'inner2');
  const g2 = findNodeById(rotated, 'g2');
  assert.equal(canMoveInto(rotated, inner2, g2.node), false);
  assert.deepEqual(groupTargets(rotated, inner2), [], 'not offered in the dropdown');
  assert.equal(moveIntoGroup(rotated, inner2, g2.node), null);
});

test('duplicateNode re-seeds a choice point nested inside a copied group', () => {
  const parts = [{
    id: 'tree',
    children: [
      { id: 'arms', seed: 100, default: 'two', alternatives: [
        { id: 'two', weight: 1, parts: [{ id: 'arm', shape: 'cylinder', transform: {} }] },
      ] },
      { id: 'trunk', shape: 'cylinder', transform: {} },
    ],
  }];
  const copy = duplicateNode(parts, parts[0]);
  assert.equal(copy.id, 'tree-copy-1');
  assert.equal(copy.children[0].id, 'arms-copy-1');
  assert.equal(copy.children[0].seed, 101, 'nested choice point rolls independently');
  assert.equal(copy.children[0].default, 'two-copy-1');
  assert.deepEqual(copy.children[0].alternatives[0].parts.map((p) => p.id), ['arm-copy-1']);
  assert.equal(parts[0].children[0].seed, 100, 'original seed untouched');
});

test('duplicateNode gives two copied choice points distinct seeds', () => {
  const parts = [{
    id: 'g',
    children: [
      { id: 'a', seed: 100, default: 'o1', alternatives: [{ id: 'o1', weight: 1, parts: [] }] },
      { id: 'b', seed: 101, default: 'o2', alternatives: [{ id: 'o2', weight: 1, parts: [] }] },
    ],
  }];
  const copy = duplicateNode(parts, parts[0]);
  const seeds = copy.children.map((c) => c.seed);
  assert.notEqual(seeds[0], seeds[1], 'distinct seeds within the copy');
  assert.ok(seeds.every((s) => s >= 100 && s < 200), 'stays in the reserved lane');
});
