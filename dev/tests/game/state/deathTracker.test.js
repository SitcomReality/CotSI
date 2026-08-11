/**
 * deathTracker.test.js — Centralized death recording
 * (src/game/state/deathTracker.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordDeath } from '../../../../src/game/state/deathTracker.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';
import { coordKey } from '../../../../src/engine/rules/hexGrid.js';

test('recordDeath: records order, event, log, and clears the spatial index', () => {
  const champ = makeChampion({ id: 'cA', name: 'The Scribe', pos: { q: 0, r: 0 } });
  const state = makeState({ champions: [champ, makeChampion({ id: 'cB' })] });
  state.spatialIndex.set(coordKey(champ.pos), { type: 'champion', entity: champ });

  recordDeath(state, champ, 'was erased by marginalia');

  assert.deepEqual(state.deathOrder, ['cA']);
  assert.deepEqual(state.deathEvent, { deadChamps: [{ championId: 'cA', cause: 'was erased by marginalia' }] });
  assert.equal(state.logs[0].category, 'death');
  assert.equal(state.logs[0].plainText, 'The Scribe has fallen — was erased by marginalia');
  assert.equal(state.spatialIndex.get(coordKey(champ.pos)), undefined);
});

test('recordDeath: multiple deaths accumulate in one event', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const c2 = makeChampion({ id: 'cB', pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [c1, c2] });

  recordDeath(state, c1, 'first');
  recordDeath(state, c2, 'second');

  assert.deepEqual(state.deathOrder, ['cA', 'cB']);
  assert.equal(state.deathEvent.deadChamps.length, 2);
  assert.equal(state.deathEvent.deadChamps[1].cause, 'second');
});

test('recordDeath: skips mobs and non-champion entities', () => {
  const mob = makeMob({ id: 'mA' });
  const state = makeState({ mobs: [mob] });

  recordDeath(state, mob, 'slain');

  assert.equal(state.deathOrder.length, 0);
  assert.equal(state.deathEvent, null);
  assert.equal(state.logs.length, 0);
});

test('recordDeath: skips null and id-less champions', () => {
  const state = makeState({ champions: [makeChampion()] });

  recordDeath(state, null, 'cause');
  recordDeath(state, {}, 'cause');

  assert.equal(state.deathOrder.length, 0);
  assert.equal(state.deathEvent, null);
  assert.equal(state.logs.length, 0);
});

test('recordDeath: does not set alive itself (caller owns life state)', () => {
  const champ = makeChampion({ id: 'cA', alive: true });
  const state = makeState({ champions: [champ] });
  recordDeath(state, champ, 'fell');
  assert.equal(champ.alive, true);
});
