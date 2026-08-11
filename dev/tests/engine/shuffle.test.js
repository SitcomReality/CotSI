/**
 * shuffle.test.js — Fisher-Yates shuffle with caller-supplied RNG
 * (src/engine/rules/shuffle.js). The only previously-untested engine file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle } from '../../../src/engine/rules/shuffle.js';
import { makeRng } from '../../../src/engine/rules/seededRng.js';

test('shuffle: preserves elements and length', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, makeRng('s1'));
  assert.equal(out.length, input.length);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

test('shuffle: returns a copy, does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const before = [...input];
  shuffle(input, makeRng('s2'));
  assert.deepEqual(input, before);
});

test('shuffle: deterministic under the same seeded RNG', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7], makeRng('map42'));
  const b = shuffle([1, 2, 3, 4, 5, 6, 7], makeRng('map42'));
  assert.deepEqual(a, b);
});

test('shuffle: different seeds produce different orders (spot-check)', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('map42'));
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], makeRng('map43'));
  assert.notDeepEqual(a, b);
});

test('shuffle: empty and single-element arrays pass through', () => {
  assert.deepEqual(shuffle([], makeRng('s3')), []);
  assert.deepEqual(shuffle(['only'], makeRng('s3')), ['only']);
});

test('shuffle: constant rand 0 produces a deterministic rotation', () => {
  // With j always 0, each step swaps a[i] with a[0]:
  // [1,2,3,4] → i=3 swap → [4,2,3,1] → i=2 → [3,2,4,1] → i=1 → [2,3,4,1]
  assert.deepEqual(shuffle([1, 2, 3, 4], () => 0), [2, 3, 4, 1]);
});
