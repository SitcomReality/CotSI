/**
 * fogOfWar.test.js — Sight, fog-of-war, human view aggregation
 * (src/game/state/fogOfWar.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleKeysFor, refreshVision, getHumanView } from '../../../src/game/state/fogOfWar.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey, hexesWithinRadius } from '../../../src/engine/rules/hexGrid.js';

/** Tiles covering the radius-1 disc around the origin. */
function discTiles(radius) {
  const tiles = {};
  for (const c of hexesWithinRadius(radius)) {
    tiles[coordKey({ q: c.q, r: c.r })] = makeTile();
  }
  return tiles;
}

const discKeys = (radius, center = { q: 0, r: 0 }) =>
  hexesWithinRadius(radius)
    .map((c) => coordKey({ q: c.q + center.q, r: c.r + center.r }))
    .sort();

test('visibleKeysFor: sight 0 sees only the champion hex', () => {
  const champ = makeChampion({ pos: { q: 0, r: 0 }, sight: 0 });
  const state = makeState({ champions: [champ], tiles: discTiles(0) });
  assert.deepEqual(visibleKeysFor(state, champ), ['0,0']);
});

test('visibleKeysFor: sight 1 sees the full surrounding disc', () => {
  const champ = makeChampion({ pos: { q: 0, r: 0 }, sight: 1 });
  const state = makeState({ champions: [champ], tiles: discTiles(1) });
  assert.deepEqual(visibleKeysFor(state, champ).sort(), discKeys(1));
});

test('visibleKeysFor: lens artifact adds +1 sight', () => {
  const champ = makeChampion({ pos: { q: 0, r: 0 }, sight: 0, artifact: 'lens' });
  const state = makeState({ champions: [champ], tiles: discTiles(1) });
  assert.deepEqual(visibleKeysFor(state, champ).sort(), discKeys(1));
});

test('visibleKeysFor: results are filtered to existing tiles', () => {
  const champ = makeChampion({ pos: { q: 0, r: 0 }, sight: 1 });
  const state = makeState({
    champions: [champ],
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });
  assert.deepEqual(visibleKeysFor(state, champ).sort(), ['0,0', '1,0']);
});

test('refreshVision: sets visible, unions explored, bumps revisions', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, sight: 0, explored: ['9,9'] });
  const state = makeState({ champions: [champ], tiles: discTiles(0) });
  assert.equal(state._fogRevision, undefined);

  refreshVision(state);

  assert.deepEqual(champ.visible, ['0,0']);
  assert.deepEqual(champ.explored.sort(), ['0,0', '9,9'], 'previous exploration kept');
  assert.equal(state._fogRevision, 1);
  assert.equal(state._minimapRevision, 1);
});

test('refreshVision: skips dead champions', () => {
  const dead = makeChampion({ id: 'cDead', pos: { q: 0, r: 0 }, sight: 0, alive: false });
  const state = makeState({ champions: [dead], tiles: discTiles(0) });
  refreshVision(state);
  assert.equal(dead.visible, undefined, 'dead champion gets no visibility');
  assert.deepEqual(dead.explored, [], 'explored untouched (fixture default)');
});

test('getHumanView: no human champions reveals the whole map', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, controller: 'bot' });
  const state = makeState({ champions: [champ], tiles: discTiles(1) });
  const view = getHumanView(state);
  assert.deepEqual([...view.visible].sort(), discKeys(1));
  assert.deepEqual([...view.explored].sort(), discKeys(1));
});

test('getHumanView: unions visible/explored across human champions only', () => {
  const human1 = makeChampion({
    id: 'cH1', pos: { q: 0, r: 0 }, controller: 'human',
    visible: ['0,0'], explored: ['0,0', '1,0'],
  });
  const human2 = makeChampion({
    id: 'cH2', pos: { q: 5, r: 0 }, controller: 'human',
    visible: ['5,0'], explored: ['5,0'],
  });
  const bot = makeChampion({
    id: 'cBot', pos: { q: 8, r: 0 }, controller: 'bot',
    visible: ['8,0'], explored: ['8,0'],
  });
  const state = makeState({ champions: [human1, human2, bot] });
  const view = getHumanView(state);
  assert.deepEqual([...view.visible].sort(), ['0,0', '5,0']);
  assert.deepEqual([...view.explored].sort(), ['0,0', '1,0', '5,0']);
});
