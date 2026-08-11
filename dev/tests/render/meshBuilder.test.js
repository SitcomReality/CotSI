/**
 * meshBuilder.test.js — The record→matrix composition in buildInstanced.
 *
 * The descriptor record pipeline (recordBuilder) emits `lift` and `localPos`
 * as independent vertical offsets; buildInstanced must STACK them — a part
 * raised by lift keeps its height when an editor drag or inspector edit
 * introduces a localPos (the geometry-editor snap-to-ground regression).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../src/vendor/three.module.js';
import { buildInstanced } from '../../../src/render/hexmap3d/worldObjects/meshBuilder.js';

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

/** The world translation of the composed instance matrix at index 0. */
function translationOf(instances) {
  const mesh = buildInstanced(geometry, material, instances, 't');
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(0, m);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  m.decompose(pos, quat, scale);
  return { x: pos.x, y: pos.y, z: pos.z };
}

/** Assert a translation component within float-precision tolerance. */
function approx(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
}

test('lift and localPos.y stack in the record composition', () => {
  // y positions the pivot; lift + localPos.y both raise it.
  const { x, y, z } = translationOf([
    { partId: 'a', x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1, lift: 0.2, localPos: { x: 0, y: 0.3, z: 0 } },
  ]);
  approx(x, 0);
  approx(y, 0.6); // 0.1 + 0.3 + 0.2 — the OR rule would drop the lift to 0.4
  approx(z, 0);
});

test('a record with only lift or only localPos composes unchanged', () => {
  approx(translationOf([{ partId: 'a', x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1, lift: 0.2 }]).y, 0.3);
  approx(
    translationOf([{ partId: 'a', x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0.3, z: 0 } }]).y,
    0.4,
  );
  approx(translationOf([{ partId: 'a', x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1 }]).y, 0.1);
});

test('a record with localPos but no lift keeps horizontal offsets', () => {
  const { x, z } = translationOf([
    { partId: 'a', x: 0, y: 0, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.14, y: 0.16, z: 0.05 } },
  ]);
  approx(x, 0.14);
  approx(z, 0.05);
});
