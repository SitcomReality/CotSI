/**
 * entityQueries.test.js — Low-level stateless accessors for champion, mob,
 * trader lookups (src/game/state/entityQueries.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isVacant,
  getChampion,
  occupiedByChampion,
  occupiedByMob,
  occupiedByTrader,
  isBlockedForMovement,
} from '../../../../src/game/state/entityQueries.js';
import { makeChampion, makeMob, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey } from '../../../../src/engine/rules/hexGrid.js';

test('getChampion: finds by id, undefined for unknown', () => {
  const c1 = makeChampion({ id: 'cA' });
  const c2 = makeChampion({ id: 'cB' });
  const state = makeState({ champions: [c1, c2] });
  assert.equal(getChampion(state, 'cA'), c1);
  assert.equal(getChampion(state, 'cB'), c2);
  assert.equal(getChampion(state, 'missing'), undefined);
});

test('isVacant: passable empty tile is vacant', () => {
  const tiles = { '0,0': makeTile('plains'), '1,0': makeTile('plains') };
  const state = makeState({ tiles, champions: [makeChampion({ pos: { q: 0, r: 0 } })] });
  assert.equal(isVacant(state, '1,0'), true);
});

test('isVacant: champion, mob, and trader occupancy', () => {
  const tiles = { '0,0': makeTile(), '1,0': makeTile(), '2,0': makeTile() };
  const state = makeState({
    tiles,
    champions: [makeChampion({ id: 'cA', pos: { q: 0, r: 0 } })],
    mobs: [makeMob({ id: 'mA', pos: { q: 1, r: 0 } })],
    traders: [{ id: 'trA', pos: { q: 2, r: 0 } }],
  });
  assert.equal(isVacant(state, '0,0'), false, 'champion occupies');
  assert.equal(isVacant(state, '1,0'), false, 'mob occupies');
  assert.equal(isVacant(state, '2,0'), false, 'trader occupies');
});

test('isVacant: impassable terrain, missing tile, and feature', () => {
  const tiles = {
    '0,0': makeTile('mountain'),
    '2,0': makeTile('plains', { feature: { kind: 'tree' } }),
  };
  const state = makeState({ tiles });
  assert.equal(isVacant(state, '0,0'), false, 'impassable terrain');
  assert.equal(isVacant(state, '9,9'), false, 'missing tile');
  assert.equal(isVacant(state, '2,0'), false, 'feature present');
});

test('occupiedBy*: spatialIndex entry wins over position scan', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const m1 = makeMob({ id: 'mA', pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [c1], mobs: [m1] });
  // The index claims '9,9' holds c1 — even though champ.pos is '0,0'.
  state.spatialIndex.set('9,9', { type: 'champion', entity: c1 });
  state.spatialIndex.set('8,8', { type: 'mob', entity: m1 });
  assert.equal(occupiedByChampion(state, '9,9'), c1, 'index is authoritative');
  assert.equal(occupiedByMob(state, '8,8'), m1);
  // Keys absent from the index still resolve by position scan.
  assert.equal(occupiedByChampion(state, '0,0'), c1, 'fallback scan for unindexed key');
  assert.equal(occupiedByMob(state, '1,0'), m1);
});

test('occupiedBy*: linear position scan when index is absent', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const m1 = makeMob({ id: 'mA', pos: { q: 1, r: 0 } });
  const tr1 = { id: 'trA', pos: { q: 2, r: 0 } };
  const state = makeState({ champions: [c1], mobs: [m1], traders: [tr1] });
  state.spatialIndex = new Map(); // empty — fall back to scanning
  assert.equal(occupiedByChampion(state, '0,0'), c1);
  assert.equal(occupiedByMob(state, '1,0'), m1);
  assert.equal(occupiedByTrader(state, '2,0'), tr1);
  // Dead champions are skipped in the scan.
  const dead = makeChampion({ id: 'cDead', pos: { q: 5, r: 5 }, alive: false });
  state.champions.push(dead);
  assert.equal(occupiedByChampion(state, '5,5'), undefined);
});

test('isBlockedForMovement: terrain, bases, and occupants', () => {
  const c1 = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const c2 = makeChampion({ id: 'cB', pos: { q: 1, r: 0 } });
  const m1 = makeMob({ id: 'mA', pos: { q: 2, r: 0 } });
  const tr1 = { id: 'trA', pos: { q: 3, r: 0 } };
  const tiles = {
    '0,0': makeTile(),
    '1,0': makeTile(),
    '2,0': makeTile(),
    '3,0': makeTile(),
    '4,0': makeTile('plains', { feature: { kind: 'base', faction: 0 } }),
    '5,0': makeTile(),
    '7,0': makeTile('mountain'),
  };
  const state = makeState({ tiles, champions: [c1, c2], mobs: [m1], traders: [tr1] });
  assert.equal(isBlockedForMovement(state, '0,0', c1.id), false, 'own hex passable');
  assert.equal(isBlockedForMovement(state, '1,0', c1.id), true, 'other champion');
  assert.equal(isBlockedForMovement(state, '2,0', c1.id), true, 'mob');
  assert.equal(isBlockedForMovement(state, '3,0', c1.id), true, 'trader');
  assert.equal(isBlockedForMovement(state, '4,0', c1.id), true, 'base always blocks');
  assert.equal(isBlockedForMovement(state, '5,0', c1.id), false, 'open plains');
  assert.equal(isBlockedForMovement(state, '6,0', c1.id), true, 'missing tile');
  assert.equal(isBlockedForMovement(state, '7,0', c1.id), true, 'impassable terrain');
});
