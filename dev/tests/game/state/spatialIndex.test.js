/**
 * spatialIndex.test.js — Entity-by-hex spatial index
 * (src/game/state/spatialIndex.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rebuildSpatialIndex,
  updateSpatialIndex,
  removeFromSpatialIndex,
} from '../../../../src/game/state/spatialIndex.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';

test('rebuildSpatialIndex: indexes alive entities, skips dead', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const c2 = makeChampion({ id: 'cB', pos: { q: 1, r: 0 } });
  const cDead = makeChampion({ id: 'cD', pos: { q: 2, r: 0 }, alive: false });
  const m1 = makeMob({ id: 'mA', pos: { q: 3, r: 0 } });
  const mDead = makeMob({ id: 'mD', pos: { q: 4, r: 0 }, alive: false });
  const tr1 = { id: 'trA', pos: { q: 5, r: 0 } };
  const state = makeState({
    champions: [c1, c2, cDead],
    mobs: [m1, mDead],
    traders: [tr1],
  });

  rebuildSpatialIndex(state);

  assert.deepEqual(state.spatialIndex.get('0,0'), { type: 'champion', entity: c1 });
  assert.deepEqual(state.spatialIndex.get('1,0'), { type: 'champion', entity: c2 });
  assert.deepEqual(state.spatialIndex.get('3,0'), { type: 'mob', entity: m1 });
  assert.deepEqual(state.spatialIndex.get('5,0'), { type: 'trader', entity: tr1 });
  assert.equal(state.spatialIndex.get('2,0'), undefined, 'dead champion skipped');
  assert.equal(state.spatialIndex.get('4,0'), undefined, 'dead mob skipped');
});

test('rebuildSpatialIndex: replaces any previous index', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const state = makeState({ champions: [c1] });
  state.spatialIndex.set('9,9', { type: 'champion', entity: 'stale' });
  rebuildSpatialIndex(state);
  assert.equal(state.spatialIndex.size, 1);
  assert.equal(state.spatialIndex.get('9,9'), undefined);
});

test('updateSpatialIndex: moves an entry from old key to new key', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const state = makeState({ champions: [c1] });
  state.spatialIndex.set('0,0', { type: 'champion', entity: c1 });

  updateSpatialIndex(state, '0,0', '1,1', c1, 'champion');

  assert.equal(state.spatialIndex.get('0,0'), undefined);
  assert.deepEqual(state.spatialIndex.get('1,1'), { type: 'champion', entity: c1 });
});

test('updateSpatialIndex: newKey only (spawn) and oldKey only (leave)', () => {
  const m1 = makeMob({ id: 'mA', pos: { q: 0, r: 0 } });
  const state = makeState({ mobs: [m1] });

  updateSpatialIndex(state, null, '7,7', m1, 'mob');
  assert.deepEqual(state.spatialIndex.get('7,7'), { type: 'mob', entity: m1 });

  updateSpatialIndex(state, '7,7', null, m1, 'mob');
  assert.equal(state.spatialIndex.get('7,7'), undefined);
});

test('removeFromSpatialIndex: deletes the key', () => {
  const state = makeState();
  state.spatialIndex.set('3,3', { type: 'mob', entity: 'x' });
  removeFromSpatialIndex(state, '3,3');
  assert.equal(state.spatialIndex.get('3,3'), undefined);
  // Removing an absent key is a safe no-op.
  removeFromSpatialIndex(state, '9,9');
});
