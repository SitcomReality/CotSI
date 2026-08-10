/**
 * mat4.test.js — Pure matrix helpers (src/engine/rules/mat4.js).
 * Covers the composition helpers used by the descriptor record pipeline, and
 * the mat4ToAxisAngle inverse the geometry editor uses to fold composed
 * rotations back into a node's localAxis/localAngle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mat4Identity,
  mat4Translation,
  mat4Scale,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4Multiply,
  mat4TranslationOf,
  mat4ToAxisAngle,
} from '../../src/engine/rules/mat4.js';

/** Element-wise matrix comparison — rotation entries carry ~1e-16 trig drift. */
function expectMatrix(actual, expected, eps = 1e-9) {
  assert.equal(actual.length, 16, `matrix has ${actual.length} elements`);
  for (let i = 0; i < 16; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) < eps, 'matrix[' + i + '] = ' + actual[i] + ' vs ' + expected[i]);
  }
}

/** Apply a 3×3 rotation (upper-left of a mat4) to a vector. */
function rotateVec3(m, v) {
  return {
    x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
    y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
    z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
  };
}

/** Approximate vector comparison — trig entries carry ~1e-16 drift. */
function expectVec3(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) < eps, `x ${actual.x} vs ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < eps, `y ${actual.y} vs ${expected.y}`);
  assert.ok(Math.abs(actual.z - expected.z) < eps, `z ${actual.z} vs ${expected.z}`);
}

test('identity / translation / scale helpers produce their matrices', () => {
  assert.deepEqual(mat4Identity(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(mat4Translation(2, -1, 3.5), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, -1, 3.5, 1]);
  assert.deepEqual(mat4Scale(2, 0.5, 3), [2, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
});

test('mat4RotationY matches the documented column-major layout', () => {
  // R_y(π/2) column-major: [c,0,-s, 0,1,0, s,0,c] with c=0, s=1.
  expectMatrix(mat4RotationY(Math.PI / 2), [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]);
});

test('mat4Multiply applies the right-hand matrix first (THREE convention)', () => {
  const v = { x: 1, y: 2, z: 3 };
  // M = T(10, 0, 0) · R_y(π/2): the rotation runs first, then the translation
  // (the point is rotated around the origin, then shifted).
  const m = mat4Multiply(mat4Translation(10, 0, 0), mat4RotationY(Math.PI / 2));
  const out = {
    x: m[12] + m[0] * v.x + m[4] * v.y + m[8] * v.z,
    y: m[13] + m[1] * v.x + m[5] * v.y + m[9] * v.z,
    z: m[14] + m[2] * v.x + m[6] * v.y + m[10] * v.z,
  };
  // R_y(π/2) sends x → −z and z → x (this convention), so (1, 2, 3) → (3, 2, −1),
  // then +x10.
  expectVec3(out, { x: 13, y: 2, z: -1 });
  assert.deepEqual(mat4TranslationOf(m), { x: 10, y: 0, z: 0 });
});

test('mat4RotationAxisAngle normalizes the axis and rotates a vector as expected', () => {
  const r = mat4RotationAxisAngle({ x: 0, y: 2, z: 0 }, Math.PI / 2); // +Y, magnitude ignored
  // R_y(π/2): x → −z, z → x (this convention).
  expectVec3(rotateVec3(r, { x: 1, y: 0, z: 0 }), { x: 0, y: 0, z: -1 });
  expectVec3(rotateVec3(r, { x: 0, y: 0, z: 1 }), { x: 1, y: 0, z: 0 });
});

test('mat4ToAxisAngle recovers axis/angle for a rotation matrix', () => {
  const cases = [
    { axis: { x: 0, y: 1, z: 0 }, angle: 0.7 },
    { axis: { x: 1, y: 0, z: 0 }, angle: -1.3 },
    { axis: { x: 0.3, y: -0.5, z: 0.81 }, angle: 2.1 },
    { axis: { x: 0, y: 1, z: 0 }, angle: Math.PI }, // θ = π edge case
  ];
  for (const { axis, angle } of cases) {
    const r = mat4RotationAxisAngle(axis, angle);
    const { axis: a2, angle: a2Ang } = mat4ToAxisAngle(r);
    // Round-trip: rebuilding from the recovered values reproduces the matrix.
    expectMatrix(mat4RotationAxisAngle(a2, a2Ang), r);
  }
});

test('mat4ToAxisAngle returns +Y/0 for the identity rotation', () => {
  assert.deepEqual(mat4ToAxisAngle(mat4Identity()), { axis: { x: 0, y: 1, z: 0 }, angle: 0 });
  // rotY 2π is the identity rotation too.
  const { angle } = mat4ToAxisAngle(mat4RotationY(Math.PI * 2));
  assert.ok(Math.abs(angle) < 1e-9);
});

test('mat4ToAxisAngle round-trips composed rotations', () => {
  const composed = mat4Multiply(
    mat4RotationY(Math.PI / 2),
    mat4RotationAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2),
  );
  const { axis, angle } = mat4ToAxisAngle(composed);
  expectMatrix(mat4RotationAxisAngle(axis, angle), composed);
});
