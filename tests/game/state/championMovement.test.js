/**
 * championMovement.test.js — Walkable range, movement execution, daily moves
 * (src/game/state/championMovement.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  movementRange,
  adjacentPassable,
  dailyMoves,
  moveChampion,
} from '../../../src/game/state/championMovement.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey, parseKey, distance, neighbors, hexesWithinRadius } from '../../../src/engine/rules/hexGrid.js';

/** Tiles covering the radius-N disc around the origin (all plains). */
function discTiles(radius) {
  const tiles = {};
  for (const c of hexesWithinRadius(radius)) {
    tiles[coordKey({ q: c.q, r: c.r })] = makeTile();
  }
  return tiles;
}

test('movementRange: open disc gives every hex at its true distance', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, moves: 2 });
  const state = makeState({ champions: [champ], tiles: discTiles(2) });

  const costs = movementRange(state, champ);

  assert.equal(costs['0,0'], 0);
  assert.deepEqual(Object.keys(costs).sort(), hexesWithinRadius(2).map((c) => coordKey(c)).sort());
  for (const [key, cost] of Object.entries(costs)) {
    assert.equal(cost, distance({ q: 0, r: 0 }, parseKey(key)), `cost for ${key}`);
  }
});

test('movementRange: blocked tiles are excluded and not routed through', () => {
  const tiles = discTiles(3);
  tiles['2,0'] = makeTile('mountain'); // sole gateway to '3,0' at cost 3
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, moves: 3 });
  const state = makeState({ champions: [champ], tiles });

  const costs = movementRange(state, champ);

  assert.equal(costs['2,0'], undefined, 'blocked tile unreachable');
  assert.equal(costs['3,0'], undefined, 'hex behind the blocker unreachable');
  assert.ok(costs['1,0'] === 1, 'adjacent open hex still reachable');
});

test('movementRange: respects the moves budget', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, moves: 1 });
  const state = makeState({ champions: [champ], tiles: discTiles(2) });
  const costs = movementRange(state, champ);
  const maxCost = Math.max(...Object.values(costs));
  assert.equal(maxCost, 1);
  assert.deepEqual(Object.keys(costs).sort(), hexesWithinRadius(1).map((c) => coordKey(c)).sort());
});

test('adjacentPassable: returns unblocked neighbor keys', () => {
  const tiles = discTiles(1);
  tiles['1,0'] = makeTile('mountain');
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const state = makeState({ champions: [champ], tiles });

  const keys = adjacentPassable(state, champ);

  assert.equal(keys.length, 5);
  assert.ok(!keys.includes('1,0'), 'mountain neighbor excluded');
  assert.deepEqual(
    keys.sort(),
    neighbors({ q: 0, r: 0 }).map(coordKey).filter((k) => k !== '1,0').sort()
  );
});

test('dailyMoves: base value scales with weather day length', () => {
  const champ = makeChampion({ baseMove: 5 });
  const state = makeState();
  assert.equal(dailyMoves(state, champ), 5);
  assert.equal(dailyMoves({ ...state, weather: { ...state.weather, dayLength: 0.8 } }, champ), 4);
  assert.equal(dailyMoves({ ...state, weather: { ...state.weather, dayLength: 1.4 } }, champ), 7);
});

test('dailyMoves: spur and verdant bonuses add on top', () => {
  const spur = makeChampion({ baseMove: 5, artifact: 'spur' });
  const verdant = makeChampion({ baseMove: 5, faction: 2 });
  const both = makeChampion({ baseMove: 5, artifact: 'spur', faction: 2 });
  const state = makeState();
  assert.equal(dailyMoves(state, spur), 6);
  assert.equal(dailyMoves(state, verdant), 6);
  assert.equal(dailyMoves(state, both), 7);
});

test('dailyMoves: never below the minimum', () => {
  const champ = makeChampion({ baseMove: 0 });
  const state = makeState();
  assert.equal(dailyMoves(state, champ), 1);
});

test('moveChampion: moves, spends moves, clears combat, updates index and vision', () => {
  const champ = makeChampion({
    id: 'cA', pos: { q: 0, r: 0 }, moves: 3, lastActionCombat: true,
  });
  const state = makeState({
    champions: [champ],
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });
  state.spatialIndex.set('0,0', { type: 'champion', entity: champ });

  moveChampion(state, champ, '1,0', 1);

  assert.deepEqual(champ.pos, { q: 1, r: 0 });
  assert.equal(champ.moves, 2);
  assert.equal(champ.lastActionCombat, false);
  assert.equal(state.spatialIndex.get('0,0'), undefined);
  assert.deepEqual(state.spatialIndex.get('1,0'), { type: 'champion', entity: champ });
  assert.equal(state._fogRevision, 1, 'vision refreshed after the move');
});
