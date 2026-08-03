/**
 * tileProxy.test.js — Backward-compatible state.tiles Proxy backed by chunk
 * storage (src/game/state/tileProxy.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTileProxy } from '../../../src/game/state/tileProxy.js';
import { makeState } from '../../helpers/stateFixture.js';
import { tileToChunk, chunkKey, localCoord, localKey } from '../../../src/engine/rules/chunkGrid.js';

/** Insert a tile for key "q,r" into state.chunks (same path gameFactory uses). */
function seedChunk(state, key) {
  const [q, r] = key.split(',').map(Number);
  const { cq, cr } = tileToChunk(q, r);
  const ck = chunkKey(cq, cr);
  let chunk = state.chunks.get(ck);
  if (!chunk) {
    chunk = { tiles: new Map(), dirty: false, generated: true };
    state.chunks.set(ck, chunk);
  }
  const { lq, lr } = localCoord(cq, cr, q, r);
  chunk.tiles.set(localKey(lq, lr), { terrain: 'plains', feature: null, q, r });
}

test('empty proxy: no tiles, no keys', () => {
  const proxy = createTileProxy(makeState());
  assert.equal(proxy['0,0'], undefined);
  assert.equal('0,0' in proxy, false);
  assert.deepEqual(Object.keys(proxy), []);
});

test('proxy reads through chunk storage', () => {
  const state = makeState();
  seedChunk(state, '0,0');
  seedChunk(state, '1,0');
  const proxy = createTileProxy(state);

  assert.equal(proxy['0,0'].q, 0);
  assert.equal(proxy['1,0'].q, 1);
  assert.equal('0,0' in proxy, true);
  assert.equal('1,0' in proxy, true);
  assert.equal('9,9' in proxy, false);
  assert.deepEqual(Object.keys(proxy).sort(), ['0,0', '1,0']);
  assert.equal(Object.values(proxy).length, 2);
  assert.equal(Object.entries(proxy).length, 2);
});

test('proxy set creates chunks and stores the tile', () => {
  const state = makeState();
  const proxy = createTileProxy(state);

  proxy['7,7'] = { terrain: 'marsh', feature: null, q: 7, r: 7 };

  assert.equal(state.chunks.size, 1);
  assert.equal(proxy['7,7'].terrain, 'marsh');
  assert.deepEqual(Object.keys(proxy), ['7,7']);
});

test('proxy set overwrites existing tiles in place', () => {
  const state = makeState();
  seedChunk(state, '0,0');
  const proxy = createTileProxy(state);

  proxy['0,0'] = { terrain: 'desert', feature: null, q: 0, r: 0 };

  assert.equal(proxy['0,0'].terrain, 'desert');
  assert.equal(Object.keys(proxy).length, 1);
});

test('proxy delete removes the tile from its chunk', () => {
  const state = makeState();
  seedChunk(state, '0,0');
  seedChunk(state, '1,0');
  const proxy = createTileProxy(state);

  assert.equal(delete proxy['0,0'], true);

  assert.equal(proxy['0,0'], undefined);
  assert.equal('0,0' in proxy, false);
  assert.deepEqual(Object.keys(proxy).sort(), ['1,0']);
});

test('proxy rejects non-coordinate keys', () => {
  const proxy = createTileProxy(makeState());
  assert.equal(proxy['abc'], undefined);
  assert.equal(proxy['length'], undefined);
  assert.equal(proxy[Symbol('x')], undefined);
  assert.equal('abc' in proxy, false);
  assert.equal(proxy['1'], undefined, 'single number has no comma');
  // Strict-mode assignment through a rejecting set trap throws.
  assert.throws(() => { proxy['abc'] = 1; }, TypeError);
});
