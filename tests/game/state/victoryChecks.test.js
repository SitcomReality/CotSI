/**
 * victoryChecks.test.js — Win-condition checks (src/game/state/victoryChecks.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkVictory } from '../../../src/game/state/victoryChecks.js';
import { makeChampion, makeState } from '../../helpers/stateFixture.js';

test('relic race: champion reaching the relic target wins', () => {
  const champ = makeChampion({ id: 'cA', name: 'The Scrivener', relics: 2 });
  const state = makeState({
    champions: [champ, makeChampion({ id: 'cB' })],
    objectives: { relicRace: true, relicTarget: 2, lastStanding: false },
  });

  assert.equal(checkVictory(state), true);
  assert.equal(state.winnerId, 'cA');
  assert.equal(state.victoryReason, 'The Scrivener gathered 2 relics.');
});

test('relic race: below the target continues play', () => {
  const champ = makeChampion({ id: 'cA', relics: 1 });
  const state = makeState({
    champions: [champ, makeChampion({ id: 'cB' })],
    objectives: { relicRace: true, relicTarget: 2, lastStanding: false },
  });

  assert.equal(checkVictory(state), false);
  assert.equal(state.winnerId, null);
});

test('last standing: the only living champion wins', () => {
  const survivor = makeChampion({ id: 'cA', name: 'Last One' });
  const state = makeState({
    champions: [survivor, makeChampion({ id: 'cB', alive: false })],
    objectives: { relicRace: false, lastStanding: true },
  });

  assert.equal(checkVictory(state), true);
  assert.equal(state.winnerId, 'cA');
  assert.equal(state.victoryReason, 'Last One is the last champion standing.');
});

test('all champions dead: the Interregnum consumes all', () => {
  const state = makeState({
    champions: [makeChampion({ id: 'cA', alive: false }), makeChampion({ id: 'cB', alive: false })],
    objectives: { relicRace: false, lastStanding: true },
  });

  assert.equal(checkVictory(state), true);
  assert.equal(state.winnerId, 'none');
  assert.equal(state.victoryReason, 'The Interregnum consumes all.');
});

test('no win condition met: returns false without side effects', () => {
  const state = makeState({
    champions: [makeChampion({ id: 'cA' }), makeChampion({ id: 'cB' })],
    objectives: { relicRace: false, lastStanding: false },
  });

  assert.equal(checkVictory(state), false);
  assert.equal(state.winnerId, null);
  assert.equal(state.victoryReason, '');
});
