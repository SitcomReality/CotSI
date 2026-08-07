/**
 * worldSimulation.test.js — End-of-round world simulation and turn
 * advancement (src/game/state/worldSimulation.js): finishTurn night actions
 * and advanceTurn's order → world turn → dead-champion → victory branches.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishTurn, advanceTurn } from '../../../src/game/state/worldSimulation.js';
import { makeChampion, makeMob, makeState, makeTile } from '../../helpers/stateFixture.js';
import { WEATHER_SCRIPT } from '../../../src/game/rules/weatherScript.js';

// ── finishTurn: night actions ───────────────────────────────────────────────

test('finishTurn: standing on an unmined knot mines it, then advances', () => {
  const cA = makeChampion({ id: 'cA' });
  const cB = makeChampion({ id: 'cB' });
  const tile = makeTile('plains', { feature: { kind: 'knot', mined: false } });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    tiles: { '0,0': tile },
  });

  finishTurn(state);

  assert.equal(cA.knot, 2, 'KNOT_DEFAULT_AMOUNT mined');
  assert.equal(tile.feature, null);
  const mineLog = state.logs.find((l) => l.category === 'economy');
  assert.ok(mineLog, 'mine logged');
  assert.ok(mineLog.plainText.includes("God's Knot"));
  assert.equal(state.activeChampionId, 'cB', 'turn advanced to the next champion');
});

test('finishTurn: dig-eligible champion sets pendingDig and logs the night dig', () => {
  const cA = makeChampion({ id: 'cA' });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile() },
  });

  finishTurn(state);

  assert.equal(cA.pendingDig, true);
  assert.ok(
    state.logs.some((l) => l.category === 'economy' && l.plainText.includes('spends the night digging')),
    'night dig logged'
  );
});

test('finishTurn: a non-knot feature blocks the night dig', () => {
  const cA = makeChampion({ id: 'cA' });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile('plains', { feature: { kind: 'tree' } }) },
  });

  finishTurn(state);

  assert.equal(cA.pendingDig, false);
  assert.ok(!state.logs.some((l) => l.category === 'economy'), 'no night-dig economy log');
});

// ── advanceTurn: order flow ─────────────────────────────────────────────────

test('advanceTurn: normal case moves to the next living champion and begins their turn', () => {
  const cA = makeChampion({ id: 'cA' });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(state.activeChampionId, 'cB');
  assert.equal(cB.moves, 5, 'beginTurn granted daily moves');
  assert.equal(state.turnLock, false, 'turn lock cleared for the fresh champion');
});

test('advanceTurn: the last champion in order triggers a world turn and new day', () => {
  const cA = makeChampion({ id: 'cA' });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cB',
    tiles: { '0,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(state.day, 2);
  assert.equal(state.weather.name, WEATHER_SCRIPT[1].name, 'weather advanced to day 2');
  assert.equal(state.activeChampionId, 'cA', 'cycle restarts at the first living champion');
  assert.equal(state.herald.day, 2);
  assert.deepEqual(state.currentOrder, ['cA', 'cB']);
  const marker = state.logs.find((l) => l.category === 'marker');
  assert.ok(marker, 'day marker logged');
  assert.ok(marker.plainText.startsWith('Day 2:'));
});

test('advanceTurn: active champion who died mid-turn passes to the next living champion', () => {
  const cA = makeChampion({ id: 'cA', alive: false });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(state.activeChampionId, 'cB');
  assert.equal(state.day, 1, 'no world turn when a successor exists');
});

test('advanceTurn: dead active champion with no living successors rolls into the world turn', () => {
  // cB is alive but comes BEFORE the dead cA in the order, so nothing living
  // follows cA — the world turn must run. (With all champions dead, checkVictory
  // would short-circuit first.)
  const cB = makeChampion({ id: 'cB' });
  const cA = makeChampion({ id: 'cA', alive: false });
  const state = makeState({
    champions: [cB, cA],
    currentOrder: ['cB', 'cA'],
    globalOrder: ['cB', 'cA'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(state.day, 2);
  assert.equal(state.activeChampionId, 'cB', 'cycle restarts at the living champion');
  assert.deepEqual(state.currentOrder, ['cB']);
});

test('advanceTurn: victory short-circuits turn advancement', () => {
  const cA = makeChampion({ id: 'cA', relics: 1 });
  const cB = makeChampion({ id: 'cB' });
  const state = makeState({
    champions: [cA, cB],
    currentOrder: ['cA', 'cB'],
    globalOrder: ['cA', 'cB'],
    activeChampionId: 'cA',
    objectives: { relicRace: true, relicTarget: 1, lastStanding: false },
    tiles: { '0,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(state.winnerId, 'cA');
  assert.equal(state.activeChampionId, 'cA', 'turn does not advance');
  assert.equal(state.day, 1);
});

// ── world turn: side effects ────────────────────────────────────────────────

test('world turn: mobs harass adjacent champions', () => {
  const cA = makeChampion({ id: 'cA', faction: 0, hp: 10, maxHp: 10 });
  const mob = makeMob({ id: 'mA', pos: { q: 1, r: 0 }, aggressive: false });
  const state = makeState({
    champions: [cA],
    mobs: [mob],
    currentOrder: ['cA'],
    globalOrder: ['cA'],
    activeChampionId: 'cA',
    _rng: () => 0.01,
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });

  advanceTurn(state); // single champion → straight to the world turn

  assert.equal(cA.hp, 6, 'base 4 damage + floor(0.01 × 5)');
  assert.ok(state.logs.some((l) => l.category === 'combat' && l.plainText.includes('harasses')));
});

test('world turn: lethal harassment records the death', () => {
  const cA = makeChampion({ id: 'cA', faction: 0, hp: 3, maxHp: 10 });
  const mob = makeMob({ id: 'mA', pos: { q: 1, r: 0 }, aggressive: false });
  const state = makeState({
    champions: [cA],
    mobs: [mob],
    currentOrder: ['cA'],
    globalOrder: ['cA'],
    activeChampionId: 'cA',
    _rng: () => 0.01,
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });

  advanceTurn(state);

  assert.equal(cA.alive, false);
  assert.deepEqual(state.deathOrder, ['cA']);
  assert.equal(state.deathEvent.deadChamps.length, 1);
  assert.equal(state.activeChampionId, null, 'no living champions remain');
});

test('world turn: unripe fruit trees ripen on their due day', () => {
  const cA = makeChampion({ id: 'cA' });
  const treeTile = makeTile('plains', { feature: { kind: 'fruitTree', ripe: false, nextRewardDay: 1 } });
  const state = makeState({
    champions: [cA],
    currentOrder: ['cA'],
    globalOrder: ['cA'],
    activeChampionId: 'cA',
    day: 1,
    _regrowingFeatures: new Set(['0,0']),
    tiles: { '0,0': treeTile },
  });

  advanceTurn(state);

  assert.equal(treeTile.feature.ripe, true);
  assert.equal(state._regrowingFeatures.size, 0);
});

test('world turn: traders step toward their target base', () => {
  const cA = makeChampion({ id: 'cA' });
  const tr = { id: 'trA', pos: { q: 0, r: 0 }, targetBaseKey: '1,0', movesPerDay: 1 };
  const state = makeState({
    champions: [cA],
    traders: [tr],
    currentOrder: ['cA'],
    globalOrder: ['cA'],
    activeChampionId: 'cA',
    tiles: { '0,0': makeTile(), '1,0': makeTile() },
  });

  advanceTurn(state);

  assert.deepEqual(tr.pos, { q: 1, r: 0 });
});
