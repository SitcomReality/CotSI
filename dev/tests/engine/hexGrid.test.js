/**
 * hexGrid.test.js — Invariants for the axial hex-grid math (src/engine/rules/hexGrid.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coordKey, parseKey, distance, neighbors,
  hexesWithinRadius, cubeRound, hexRing,
} from '../../../src/engine/rules/hexGrid.js';

const key = (q, r) => `${q},${r}`;

test('coordKey/parseKey round-trip', () => {
  for (const [q, r] of [[0, 0], [3, -2], [-5, 7], [1, 1]]) {
    const k = coordKey({ q, r });
    assert.equal(k, key(q, r));
    assert.deepEqual(parseKey(k), { q, r });
  }
});

test('distance: zero iff same hex, symmetric', () => {
  assert.equal(distance({ q: 0, r: 0 }, { q: 0, r: 0 }), 0);
  assert.equal(distance({ q: 4, r: -1 }, { q: 4, r: -1 }), 0);
  const a = { q: 2, r: 3 };
  const b = { q: -1, r: 5 };
  assert.equal(distance(a, b), distance(b, a));
});

test('distance: known axial values', () => {
  assert.equal(distance({ q: 0, r: 0 }, { q: 2, r: 0 }), 2);
  assert.equal(distance({ q: 0, r: 0 }, { q: 1, r: 1 }), 2);
  assert.equal(distance({ q: 0, r: 0 }, { q: 3, r: -3 }), 3);
  assert.equal(distance({ q: 1, r: -2 }, { q: -2, r: 3 }), 5);
});

test('distance: triangle inequality', () => {
  const points = [{ q: 0, r: 0 }, { q: 3, r: 1 }, { q: -2, r: 4 }, { q: 1, r: -3 }];
  for (const a of points) {
    for (const b of points) {
      for (const c of points) {
        assert.ok(distance(a, c) <= distance(a, b) + distance(b, c),
          `triangle inequality violated: ${JSON.stringify(a)} ${JSON.stringify(b)} ${JSON.stringify(c)}`);
      }
    }
  }
});

test('neighbors: 6 distinct hexes at distance 1', () => {
  const origin = { q: 0, r: 0 };
  const ns = neighbors(origin);
  assert.equal(ns.length, 6);
  const uniq = new Set(ns.map(coordKey));
  assert.equal(uniq.size, 6, 'neighbors must be distinct');
  for (const n of ns) {
    assert.equal(distance(origin, n), 1);
  }
});

test('neighbors: closed ring (each neighbor lists origin)', () => {
  const origin = { q: 0, r: 0 };
  for (const n of neighbors(origin)) {
    const back = neighbors(n).map(coordKey);
    assert.ok(back.includes(coordKey(origin)), `${coordKey(n)} must list origin as a neighbor`);
  }
});

test('hexesWithinRadius: count formula 1 + 3r(r+1)', () => {
  for (let r = 0; r <= 5; r++) {
    assert.equal(hexesWithinRadius(r).length, 1 + 3 * r * (r + 1), `r=${r}`);
  }
});

test('hexesWithinRadius: every result satisfies the axial constraint', () => {
  for (const r of [1, 3, 6]) {
    for (const { q, r: rr } of hexesWithinRadius(r)) {
      const s = -q - rr;
      assert.ok(Math.abs(q) <= r && Math.abs(rr) <= r && Math.abs(s) <= r,
        `(${q},${rr}) outside radius ${r}`);
    }
  }
});

test('hexRing: count and geometry', () => {
  assert.deepEqual(hexRing(0), [{ q: 0, r: 0 }]);
  for (const r of [1, 2, 4]) {
    const ring = hexRing(r);
    assert.equal(ring.length, 6 * r, `r=${r} ring size`);
    const uniq = new Set(ring.map(coordKey));
    assert.equal(uniq.size, ring.length, 'ring hexes must be distinct');
    for (const h of ring) {
      assert.equal(distance({ q: 0, r: 0 }, h), r, `hex ${JSON.stringify(h)} at wrong radius`);
    }
  }
});

test('cubeRound: integer coords round-trip exactly', () => {
  for (const [q, r] of [[0, 0], [2, -1], [-4, 6], [1, 2]]) {
    assert.deepEqual(cubeRound(q, r), { q, r });
  }
});

test('cubeRound: fractional coords land on a nearby valid integer hex', () => {
  const cases = [
    [0.4, 0.1], [1.6, -0.7], [-2.3, 3.8], [0.1, 0.1], [7.5, -3.2],
  ];
  for (const [qf, rf] of cases) {
    const rounded = cubeRound(qf, rf);
    // Result must be integer and within distance 1 of the fractional point.
    assert.ok(Number.isInteger(rounded.q) && Number.isInteger(rounded.r));
    assert.ok(distance({ q: rounded.q, r: rounded.r }, { q: qf, r: rf }) <= 1,
      `cubeRound(${qf},${rf}) = ${JSON.stringify(rounded)} too far`);
  }
});

test('cubeRound: result satisfies q+r+s=0 (valid axial)', () => {
  for (const [qf, rf] of [[0.3, 0.7], [-1.2, 0.4], [2.9, 2.9]]) {
    const { q, r } = cubeRound(qf, rf);
    assert.equal(q + r + (-q - r), 0);
  }
});
