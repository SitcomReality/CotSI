/**
 * pathfinding.test.js — BFS pathfinding invariants (src/engine/rules/pathfinding.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../../../src/engine/rules/pathfinding.js';
import { coordKey, neighbors, distance } from '../../../src/engine/rules/hexGrid.js';

const open = () => () => true;

/** Verify a path is contiguous, starts adjacent to start, ends at target, no diagonal skips.
 *  findPath excludes the start hex — the path begins at the first step. */
function assertValidPath(path, sx, sy, tx, ty) {
  assert.ok(Array.isArray(path), 'path should be an array');
  assert.ok(path.length > 0, 'path should not be empty');
  assert.equal(distance(path[0], { q: sx, r: sy }), 1, 'first step must be adjacent to start');
  assert.deepEqual(path[path.length - 1], { q: tx, r: ty });
  for (let i = 0; i < path.length - 1; i++) {
    assert.equal(distance(path[i], path[i + 1]), 1, 'consecutive path steps must be adjacent');
  }
}

test('findPath: straight line on open grid', () => {
  const path = findPath(0, 0, 3, 0, 'c1', open());
  assertValidPath(path, 0, 0, 3, 0);
  assert.equal(path.length, 3, 'straight-line path should have 3 steps (start excluded)');
});

test('findPath: shortest path length equals hex distance on open grid', () => {
  const [sx, sy, tx, ty] = [0, 0, -4, 2];
  const path = findPath(sx, sy, tx, ty, 'c1', open());
  assertValidPath(path, sx, sy, tx, ty);
  assert.equal(path.length, distance({ q: sx, r: sy }, { q: tx, r: ty }));
});

test('findPath: routes around an obstacle', () => {
  const blocked = new Set(['2,0']); // hex (2,0) blocks the direct line from (0,0) to (3,0)
  const path = findPath(0, 0, 3, 0, 'c1', (key) => !blocked.has(key));
  assertValidPath(path, 0, 0, 3, 0);
  for (const step of path) {
    assert.ok(!blocked.has(coordKey(step)), 'path must not enter blocked hex');
  }
});

test('findPath: returns null when target unreachable', () => {
  const reachable = new Set(['0,0']);
  const path = findPath(0, 0, 3, 0, 'c1', (key) => reachable.has(key));
  assert.equal(path, null);
});

test('findPath: canEnter is consulted for every step', () => {
  const visited = new Set();
  const path = findPath(0, 0, 2, 0, 'c1', (key) => {
    visited.add(key);
    return true;
  });
  assert.ok(path.length > 0);
  for (const step of path) {
    assert.ok(visited.has(coordKey(step)), 'canEnter must be called for each path hex');
  }
});

test('findPath: start equals target yields empty path', () => {
  const path = findPath(2, 2, 2, 2, 'c1', open());
  assert.deepEqual(path, []);
});

test('findPath: does not revisit hexes (no infinite loops)', () => {
  // Full open grid, longish path — completes in bounded time.
  const path = findPath(0, 0, 6, -6, 'c1', open());
  assertValidPath(path, 0, 0, 6, -6);
  const seen = new Set();
  for (const step of path) {
    assert.ok(!seen.has(coordKey(step)), 'path must not repeat a hex');
    seen.add(coordKey(step));
  }
});
