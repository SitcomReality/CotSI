/**
 * seededRng.test.js — Determinism and range invariants for the seeded RNG
 * (src/engine/rules/seededRng.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stringSeed, makeRng, hash32, seededNoise } from '../../src/engine/rules/seededRng.js';

const firstN = (fn, n) => Array.from({ length: n }, fn);

test('stringSeed: deterministic and uint32', () => {
  assert.equal(stringSeed('hello'), stringSeed('hello'));
  assert.ok(Number.isInteger(stringSeed('hello')));
  assert.ok(stringSeed('hello') >= 0 && stringSeed('hello') <= 0xffffffff);
  // Different inputs produce different hashes (spot-check).
  const seen = new Set(['', 'a', 'abc', 'seed-42', 'another-seed'].map(stringSeed));
  assert.equal(seen.size, 5, 'distinct strings should produce distinct hashes');
});

test('makeRng: same seed → identical sequence', () => {
  const a = firstN(makeRng('map42'), 10);
  const b = firstN(makeRng('map42'), 10);
  assert.deepEqual(a, b);
});

test('makeRng: different seeds → different sequences', () => {
  const a = firstN(makeRng('map42'), 10);
  const b = firstN(makeRng('map43'), 10);
  assert.notDeepEqual(a, b);
});

test('makeRng: values in [0, 1)', () => {
  const seq = firstN(makeRng('any-seed'), 100);
  for (const v of seq) {
    assert.ok(v >= 0 && v < 1, `value ${v} outside [0,1)`);
  }
});

test('makeRng: independent instances do not share state', () => {
  const rngA = makeRng('shared');
  const rngB = makeRng('shared');
  for (let i = 0; i < 5; i++) {
    assert.equal(rngA(), rngB(), 'parallel instances must produce identical values');
  }
});

test('hash32: deterministic, uint32', () => {
  assert.equal(hash32(12345), hash32(12345));
  assert.ok(hash32(0) >= 0 && hash32(0) <= 0xffffffff);
  assert.ok(hash32(999) >= 0 && hash32(999) <= 0xffffffff);
});

test('seededNoise: deterministic per (intSeed, q, r, salt)', () => {
  const seed = stringSeed('s');
  assert.equal(seededNoise(seed, 1, 2, 3), seededNoise(seed, 1, 2, 3));
  assert.equal(seededNoise(seed, 1, 2), seededNoise(seed, 1, 2));
});

test('seededNoise: salt changes the output', () => {
  const seed = stringSeed('s');
  assert.notEqual(seededNoise(seed, 1, 2, 0), seededNoise(seed, 1, 2, 1));
});

test('seededNoise: different integer seeds produce different output', () => {
  assert.notEqual(
    seededNoise(stringSeed('alpha'), 0, 0, 0),
    seededNoise(stringSeed('beta'), 0, 0, 0)
  );
});

test('seededNoise: value in [0, 1)', () => {
  const seed = stringSeed('grid');
  for (let q = 0; q < 20; q++) {
    for (let r = 0; r < 20; r++) {
      const v = seededNoise(seed, q, r, 7);
      assert.ok(v >= 0 && v < 1, `value ${v} outside [0,1)`);
    }
  }
});
