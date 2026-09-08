/**
 * chunkRebuildMode.test.js — The rebuild-scope decision in the render
 * chunkManager: terrain/water gate only on the explored set, so a runtime
 * dirty mark with an unchanged explored count needs a features-only rebuild.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkRebuildMode } from '../../../src/render/hexmap3d/chunkManager.js';

const entry = { exploredCount: 12 };
const clean = { dirty: false };
const dirty = { dirty: true };

test('a missing entry needs a full rebuild', () => {
  assert.equal(chunkRebuildMode(undefined, dirty, 12), 'full');
  assert.equal(chunkRebuildMode(undefined, clean, 0), 'full');
});

test('a grown explored count needs a full rebuild', () => {
  assert.equal(chunkRebuildMode(entry, clean, 13), 'full');
  assert.equal(chunkRebuildMode(entry, dirty, 13), 'full');
});

test('a dirty chunk with an unchanged explored count needs only features', () => {
  assert.equal(chunkRebuildMode(entry, dirty, 12), 'features');
});

test('a clean chunk with an unchanged explored count needs nothing', () => {
  assert.equal(chunkRebuildMode(entry, clean, 12), 'none');
});
