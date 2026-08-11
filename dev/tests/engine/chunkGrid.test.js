/**
 * chunkGrid.test.js — Chunk coordinate math invariants (src/engine/rules/chunkGrid.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tileToChunk, chunkKey, chunkKeyFromTile, localCoord, globalCoord,
  localKey, chunkNeighbors, hexesInChunk,
} from '../../../src/engine/rules/chunkGrid.js';
import { CHUNK_SIZE, TILE_TO_CHUNK_OFFSET } from '../../../src/params/engine/chunkParams.js';

test('CHUNK_SIZE and offset are the expected constants', () => {
  assert.equal(CHUNK_SIZE, 24);
  assert.equal(TILE_TO_CHUNK_OFFSET, 0.5);
});

test('tileToChunk: origin maps to chunk (0,0)', () => {
  assert.deepEqual(tileToChunk(0, 0), { cq: 0, cr: 0 });
});

test('tileToChunk: boundary tiles fall just inside their chunk', () => {
  // Chunk (0,0) covers q ∈ [cq*24 - 12, cq*24 + 12) with the +0.5 offset.
  assert.deepEqual(tileToChunk(-12, 0), { cq: 0, cr: 0 });
  assert.deepEqual(tileToChunk(11, 0), { cq: 0, cr: 0 });
  assert.deepEqual(tileToChunk(12, 0), { cq: 1, cr: 0 });
  assert.deepEqual(tileToChunk(-13, 0), { cq: -1, cr: 0 });
});

test('tileToChunk: deterministic and invertible via globalCoord', () => {
  for (const [q, r] of [[0, 0], [23, -17], [-31, 40], [100, -100], [-12, 11]]) {
    const { cq, cr } = tileToChunk(q, r);
    const { lq, lr } = localCoord(cq, cr, q, r);
    const back = globalCoord(cq, cr, lq, lr);
    assert.deepEqual(back, { q, r }, `round-trip failed for (${q},${r})`);
  }
});

test('localCoord: local keys are within chunk bounds', () => {
  for (const [q, r] of [[0, 0], [23, -17], [-31, 40], [100, -100]]) {
    const { cq, cr } = tileToChunk(q, r);
    const { lq, lr } = localCoord(cq, cr, q, r);
    assert.ok(lq >= -CHUNK_SIZE / 2 && lq < CHUNK_SIZE / 2, `lq ${lq} out of range`);
    assert.ok(lr >= -CHUNK_SIZE / 2 && lr < CHUNK_SIZE / 2, `lr ${lr} out of range`);
  }
});

test('chunkKey and chunkKeyFromTile are consistent', () => {
  assert.equal(chunkKey(2, -3), '2,-3');
  assert.equal(chunkKeyFromTile(30, -17), chunkKey(...Object.values(tileToChunk(30, -17))));
  assert.equal(chunkKeyFromTile(0, 0), '0,0');
});

test('localKey format', () => {
  assert.equal(localKey(3, -4), '3,-4');
  assert.equal(localKey(-12, 11), '-12,11');
});

test('hexesInChunk: exactly CHUNK_SIZE² tiles, all map back to the chunk', () => {
  for (const [cq, cr] of [[0, 0], [1, -2], [-3, 1]]) {
    const hexes = hexesInChunk(cq, cr);
    assert.equal(hexes.length, CHUNK_SIZE * CHUNK_SIZE);
    const seen = new Set(hexes.map(({ q, r }) => localKey(q - cq * CHUNK_SIZE, r - cr * CHUNK_SIZE)));
    assert.equal(seen.size, CHUNK_SIZE * CHUNK_SIZE, 'hexes in chunk must be unique');
    for (const { q, r } of hexes) {
      assert.deepEqual(tileToChunk(q, r), { cq, cr });
    }
  }
});

test('chunkNeighbors: 8 distinct neighbors, none equal the center', () => {
  const nbrs = chunkNeighbors(0, 0);
  assert.equal(nbrs.length, 8);
  const keys = new Set(nbrs.map(({ cq, cr }) => chunkKey(cq, cr)));
  assert.equal(keys.size, 8, 'chunk neighbors must be distinct');
  assert.ok(!keys.has('0,0'), 'center must not be its own neighbor');
  // Every neighbor differs by at most 1 in each axis (Moore neighborhood).
  for (const { cq, cr } of nbrs) {
    assert.ok(Math.abs(cq) <= 1 && Math.abs(cr) <= 1);
  }
});
