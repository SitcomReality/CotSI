/**
 * noise.test.js — Determinism and range invariants for the seeded noise
 * (src/engine/rules/noise.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fbm2D, hexFbm2D, ridgedFbm2D, hexRidgedFbm2D, hexToWorld } from '../../src/engine/rules/noise.js';
import { cubeRound } from '../../src/engine/rules/hexGrid.js';

test('fbm2D: deterministic', () => {
  assert.equal(fbm2D(0.5, 0.25, 'seedA', { octaves: 4 }), fbm2D(0.5, 0.25, 'seedA', { octaves: 4 }));
  assert.equal(hexFbm2D(3, -2, 'seedB'), hexFbm2D(3, -2, 'seedB'));
});

test('fbm2D: output within [0, 1]', () => {
  for (let x = 0; x < 30; x++) {
    for (let y = 0; y < 30; y++) {
      const v = fbm2D(x * 0.1, y * 0.1, 'range-test');
      assert.ok(v >= 0 && v <= 1, `fbm2D gave ${v}`);
    }
  }
});

test('fbm2D: different seeds produce different values', () => {
  assert.notEqual(fbm2D(0.5, 0.5, 'seedA'), fbm2D(0.5, 0.5, 'seedB'));
});

test('ridgedFbm2D: deterministic and within [0, 1]', () => {
  assert.equal(ridgedFbm2D(0.5, 0.25, 'seedA'), ridgedFbm2D(0.5, 0.25, 'seedA'));
  for (let x = 0; x < 30; x++) {
    for (let y = 0; y < 30; y++) {
      const v = ridgedFbm2D(x * 0.1, y * 0.1, 'range-test');
      assert.ok(v >= 0 && v <= 1, `ridgedFbm2D gave ${v}`);
    }
  }
});

test('ridgedFbm2D: different seeds produce different values', () => {
  assert.notEqual(ridgedFbm2D(0.5, 0.5, 'seedA'), ridgedFbm2D(0.5, 0.5, 'seedB'));
});

test('hexFbm2D / hexRidgedFbm2D: consistent with world-space sampling', () => {
  const { x, y } = hexToWorld(4, -2);
  assert.equal(hexFbm2D(4, -2, 'seedC'), fbm2D(x, y, 'seedC'));
  assert.equal(hexRidgedFbm2D(4, -2, 'seedC'), ridgedFbm2D(x, y, 'seedC'));
});

test('hexToWorld → cubeRound round-trips integer hexes', () => {
  const hexes = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -3, r: 5 }, { q: 12, r: -7 }];
  for (const { q, r } of hexes) {
    const { x, y } = hexToWorld(q, r);
    // Invert the axial→world projection: r = y / 0.8660, q = x - r/2.
    const rf = y / 0.8660254037844386;
    const qf = x - rf * 0.5;
    assert.deepEqual(cubeRound(qf, rf), { q, r });
  }
});
