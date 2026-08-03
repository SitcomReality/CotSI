/**
 * binaryHeap.test.js — Ordering and duplicate-entry behavior of the min-heap
 * (src/engine/rules/binaryHeap.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMinHeap } from '../../src/engine/rules/binaryHeap.js';

test('createMinHeap: pops in ascending priority order', () => {
  const heap = createMinHeap();
  heap.push('a', 3);
  heap.push('b', 1);
  heap.push('c', 2);
  heap.push('d', 0);
  assert.equal(heap.size, 4);
  assert.equal(heap.pop().key, 'd');
  assert.equal(heap.pop().key, 'b');
  assert.equal(heap.pop().key, 'c');
  assert.equal(heap.pop().key, 'a');
  assert.ok(heap.isEmpty());
});

test('createMinHeap: returns undefined when empty', () => {
  const heap = createMinHeap();
  assert.ok(heap.isEmpty());
  assert.equal(heap.pop(), undefined);
});

test('createMinHeap: duplicate keys pop in priority order', () => {
  const heap = createMinHeap();
  heap.push('x', 5);
  heap.push('x', 3);
  heap.push('x', 4);
  const popped = [heap.pop().priority, heap.pop().priority, heap.pop().priority];
  assert.deepEqual(popped, [3, 4, 5]);
});

test('createMinHeap: large shuffled insert preserves sorted pop order', () => {
  const heap = createMinHeap();
  const n = 1000;
  // Insert in shuffled order (deterministic LCG for reproducibility)
  let s = 42;
  const rand = () => {
    s = Math.imul(s ^ (s >>> 13), 1274126177);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i++) heap.push(i, Math.floor(rand() * n));
  let prev = -1;
  while (!heap.isEmpty()) {
    const { priority } = heap.pop();
    assert.ok(priority >= prev, `out of order: ${priority} < ${prev}`);
    prev = priority;
  }
});
