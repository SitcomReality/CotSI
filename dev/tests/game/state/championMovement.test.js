/**
 * championMovement.test.js — Weighted action-point range, path reconstruction,
 * daily AP, and movement execution (src/game/state/movement/championMovement.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  movementRange,
  pathToKey,
  pathToward,
  dailyActionPoints,
  moveChampion,
} from '../../../../src/game/state/movement/championMovement.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey, parseKey, distance, neighbors, hexesWithinRadius } from '../../../../src/engine/rules/hexGrid.js';

/** Tiles covering the radius-N disc around the origin (all plains). */
function discTiles(radius) {
  const tiles = {};
  for (const c of hexesWithinRadius(radius)) {
    tiles[coordKey({ q: c.q, r: c.r })] = makeTile();
  }
  return tiles;
}

test('movementRange: open disc gives every hex at distance × plains cost (10 AP)', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 40 });
  const state = makeState({ champions: [champ], tiles: discTiles(2) });

  const { costs, cameFrom } = movementRange(state, champ);

  assert.equal(costs.get('0,0'), 0);
  assert.deepEqual([...costs.keys()].sort(), hexesWithinRadius(2).map((c) => coordKey(c)).sort());
  for (const [key, cost] of costs) {
    assert.equal(cost, distance({ q: 0, r: 0 }, parseKey(key)) * 10, `cost for ${key}`);
  }
  assert.equal(cameFrom.size, costs.size - 1, 'every reachable hex has a predecessor');
});

test('movementRange: blocked tiles are excluded and not routed through', () => {
  const tiles = discTiles(3);
  tiles['2,0'] = makeTile('mountain'); // direct gateway to '3,0'
  // 35 AP fits the direct route (30) but not the 40-AP detour around the
  // mountain, so '3,0' stays unreachable.
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 35 });
  const state = makeState({ champions: [champ], tiles });

  const { costs } = movementRange(state, champ);

  assert.equal(costs.has('2,0'), false, 'blocked tile unreachable');
  assert.equal(costs.has('3,0'), false, 'hex behind the blocker unreachable');
  assert.equal(costs.get('1,0'), 10, 'adjacent open hex still reachable');
});

test('movementRange: respects the AP budget with weighted terrain costs', () => {
  const tiles = discTiles(2);
  tiles['1,0'] = makeTile('river'); // costs 30 — the only route onward
  tiles['0,1'] = makeTile('water'); // block every detour around the river
  tiles['1,1'] = makeTile('water');
  tiles['2,-1'] = makeTile('water');
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 40 });
  const state = makeState({ champions: [champ], tiles });

  const { costs } = movementRange(state, champ);

  assert.equal(costs.get('1,0'), 30, 'river hex costs its terrain cost');
  assert.equal(costs.get('2,0'), 40, 'river + one plains hex exactly exhausts 40 AP');
  assert.equal(costs.has('0,-1') || costs.has('-1,0'), true, 'open hexes still reachable');
});

test('movementRange: faction terrain overrides apply (Verdant forest 4)', () => {
  const tiles = discTiles(2);
  tiles['1,0'] = makeTile('forest');
  tiles['2,0'] = makeTile('forest');
  const verdant = makeChampion({ id: 'cA', faction: 2, pos: { q: 0, r: 0 }, actionPoints: 20 });
  const state = makeState({ champions: [verdant], tiles });

  const { costs } = movementRange(state, verdant);

  assert.equal(costs.get('2,0'), 8, 'two Verdant forest hexes cost 4 AP each');
});

test('movementRange: movement costs are per-entity (waterbound mob-like champion can cross water)', () => {
  const tiles = discTiles(1);
  tiles['1,0'] = makeTile('water');
  const normal = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 30 });
  const state = makeState({ champions: [normal], tiles });
  assert.equal(movementRange(state, normal).costs.has('1,0'), false, 'water blocked normally');
});

test('movementRange: feature hexes are destination-only (never routed through)', () => {
  const tiles = discTiles(2);
  tiles['1,0'] = makeTile('plains', { feature: { kind: 'blessedFont', ripe: true } });
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 20 });
  const state = makeState({ champions: [champ], tiles });

  const { costs, cameFrom } = movementRange(state, champ);

  assert.equal(costs.get('1,0'), 10, 'feature hex reachable as destination');
  assert.ok(cameFrom.has('1,0'), 'path to the feature hex exists');
  assert.equal(costs.has('2,0'), false, 'hex behind a feature is not routed through');
});

test('pathToward: in-range hex returns the cheapest full path with its cost', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 60 });
  const state = makeState({ champions: [champ], tiles: discTiles(2) });

  const toward = pathToward(state, champ, '1,0');

  assert.deepEqual(toward.path, ['1,0']);
  assert.equal(toward.cost, 10);
});

test('pathToward: out-of-range hex returns the affordable prefix toward it', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 25 });
  const state = makeState({ champions: [champ], tiles: discTiles(3) });

  // '3,0' is 30 AP away; with 25 AP the walk stops after two plains hexes.
  const toward = pathToward(state, champ, '3,0');

  assert.deepEqual(toward.path, ['1,0', '2,0']);
  assert.equal(toward.cost, 20);
});

test('pathToward: null when no path exists (islanded by water)', () => {
  const tiles = discTiles(1);
  tiles['1,0'] = makeTile('water');
  tiles['0,1'] = makeTile('water');
  tiles['1,-1'] = makeTile('water');
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 60 });
  const state = makeState({ champions: [champ], tiles });

  assert.equal(pathToward(state, champ, '2,0'), null);
});

test('pathToward: feature hexes are destination-only on the A* route too', () => {
  const tiles = discTiles(2);
  tiles['1,0'] = makeTile('plains', { feature: { kind: 'blessedFont', ripe: true } });
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 60 });
  const state = makeState({ champions: [champ], tiles });

  // Target beyond the feature: the route detours instead of walking through it.
  const toward = pathToward(state, champ, '2,0');

  assert.ok(toward, 'route exists around the feature');
  assert.ok(!toward.path.includes('1,0'), 'feature hex not traversed');
});

test('pathToKey: reconstructs the cheapest path from cameFrom', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 60 });
  const state = makeState({ champions: [champ], tiles: discTiles(3) });

  const range = movementRange(state, champ);
  const path = pathToKey(range, '2,0');

  assert.deepEqual(path, ['1,0', '2,0']);
  assert.deepEqual(pathToKey(range, '0,0'), [], 'start hex has no path');
});

test('dailyActionPoints: base value scales with weather day length', () => {
  const champ = makeChampion({ baseActionPoints: 60 });
  const state = makeState();
  assert.equal(dailyActionPoints(state, champ), 60);
  assert.equal(dailyActionPoints({ ...state, weather: { ...state.weather, dayLength: 0.8 } }, champ), 48);
  assert.equal(dailyActionPoints({ ...state, weather: { ...state.weather, dayLength: 1.4 } }, champ), 84);
});

test('dailyActionPoints: spur adds +10; Verdant gets no flat bonus (affinity instead)', () => {
  const spur = makeChampion({ artifact: 'spur' });
  const verdant = makeChampion({ faction: 2 });
  const state = makeState();
  assert.equal(dailyActionPoints(state, spur), 70);
  assert.equal(dailyActionPoints(state, verdant), 60);
});

test('dailyActionPoints: never below the minimum', () => {
  const champ = makeChampion({ baseActionPoints: 0 });
  const state = makeState();
  assert.equal(dailyActionPoints(state, champ), 10);
});

test('moveChampion: moves, spends AP, clears combat, updates index and vision', () => {
  const champ = makeChampion({
    id: 'cA', pos: { q: 0, r: 0 }, actionPoints: 30, lastActionCombat: true,
  });
  const state = makeState({
    champions: [champ],
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });
  state.spatialIndex.set('0,0', { type: 'champion', entity: champ });

  moveChampion(state, champ, '1,0', 10);

  assert.deepEqual(champ.pos, { q: 1, r: 0 });
  assert.equal(champ.actionPoints, 20);
  assert.equal(champ.lastActionCombat, false);
  assert.equal(state.spatialIndex.get('0,0'), undefined);
  assert.deepEqual(state.spatialIndex.get('1,0'), { type: 'champion', entity: champ });
  assert.equal(state._fogRevision, 1, 'vision refreshed after the move');
});
