/**
 * arrivalInteractions.test.js — Resource harvesting on champion arrival
 * (src/game/state/arrivalInteractions.js): fruit eating and knot mining.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interactOnArrival } from '../../../src/game/state/arrivalInteractions.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey } from '../../../src/engine/rules/hexGrid.js';

const here = coordKey({ q: 0, r: 0 });

test('fruit tree: standard faction heals 18 HP and marks the tree spent', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, hp: 5, maxHp: 100 });
  const tile = makeTile('plains', { feature: { kind: 'fruitTree', ripe: true } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.hp, 23);
  assert.equal(tile.feature.nextFruitDay, 5, 'day 1 + 4 regrowth days');
  assert.equal(tile.feature.ripe, false);
  assert.ok(state._unripeTrees.has(here));
  assert.equal(state.logs[0].category, 'heal');
});

test('fruit tree: Verdant (faction 2) heals double (34 HP)', () => {
  const champ = makeChampion({ id: 'cA', faction: 2, pos: { q: 0, r: 0 }, hp: 5, maxHp: 100 });
  const tile = makeTile('plains', { feature: { kind: 'fruitTree', ripe: true } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.hp, 39);
});

test('fruit tree: healing caps at max HP', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, hp: 90, maxHp: 100 });
  const tile = makeTile('plains', { feature: { kind: 'fruitTree', ripe: true } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.hp, 100);
});

test('fruit tree: spent fruit (ripe false) and unripe fruit heal nothing', () => {
  const spent = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, hp: 5, maxHp: 100 });
  const spentState = makeState({
    champions: [spent],
    tiles: { [here]: makeTile('plains', { feature: { kind: 'fruitTree', ripe: false } }) },
  });
  interactOnArrival(spentState, spent);
  assert.equal(spent.hp, 5);
  assert.equal(spentState.logs.length, 0);

  const unripe = makeChampion({ id: 'cB', pos: { q: 0, r: 0 }, hp: 5, maxHp: 100 });
  const unripeState = makeState({
    champions: [unripe],
    tiles: { [here]: makeTile('plains', { feature: { kind: 'fruitTree', ripe: true, nextFruitDay: 10 } }) },
  });
  interactOnArrival(unripeState, unripe);
  assert.equal(unripe.hp, 5, 'future fruit does not heal yet');
});

test('knot: mines the default amount and clears the feature', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, knot: 0 });
  const tile = makeTile('plains', { feature: { kind: 'knot', mined: false } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.knot, 2, 'KNOT_DEFAULT_AMOUNT');
  assert.equal(tile.feature, null);
  assert.equal(state.logs[0].category, 'economy');
});

test('knot: uses the tile amount when present', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, knot: 0 });
  const tile = makeTile('plains', { feature: { kind: 'knot', mined: false, amount: 5 } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.knot, 5);
});

test('knot: already-mined knots are skipped', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, knot: 0 });
  const tile = makeTile('plains', { feature: { kind: 'knot', mined: true } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.knot, 0);
  assert.notEqual(tile.feature, null);
  assert.equal(state.logs.length, 0);
});

test('chest: grants gold and clears the feature', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, gold: 0 });
  const tile = makeTile('plains', { feature: { kind: 'chest', amount: 12 } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.gold, 12);
  assert.equal(tile.feature, null);
  assert.equal(state.logs[0].category, 'economy');
});

test('chest: uses CHEST_GOLD_BASE when the tile has no amount', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, gold: 0 });
  const tile = makeTile('plains', { feature: { kind: 'chest' } });
  const state = makeState({ champions: [champ], tiles: { [here]: tile } });

  interactOnArrival(state, champ);

  assert.equal(champ.gold, 10, 'CHEST_GOLD_BASE');
});

test('plain tile: arrival is a no-op', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, hp: 5, knot: 0 });
  const state = makeState({ champions: [champ], tiles: { [here]: makeTile() } });

  interactOnArrival(state, champ);

  assert.equal(champ.hp, 5);
  assert.equal(champ.knot, 0);
  assert.equal(state.logs.length, 0);
});
