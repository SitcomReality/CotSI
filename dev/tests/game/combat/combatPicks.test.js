/**
 * combatPicks.test.js — Pick recording, validation, phase transitions.
 * (src/game/state/combat/combatPicks.js)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordPick,
  bothPicksIn,
  advancePhase,
  getAvailablePicks,
  createCombatState,
} from '../../../../src/game/state/combat/index.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';

function combatOf(a, b) {
  return createCombatState(makeState({ globalOrder: [a.id, b.id] }), a, b);
}

// ---- getAvailablePicks ----

test('getAvailablePicks: returns factions with potency > 0', () => {
  const champ = makeChampion({ faction: 2, potencies: [0, 0, 4, 0, 0, 0, 0] });
  assert.deepEqual(getAvailablePicks(champ), [2]);
});

test('getAvailablePicks: all 7 when every potency is positive', () => {
  const champ = makeChampion(); // default potencies [1 ×7]
  assert.deepEqual(getAvailablePicks(champ), [0, 1, 2, 3, 4, 5, 6]);
});

test('getAvailablePicks: mob without potencies → only its own faction', () => {
  const mob = makeMob({ faction: 3 });
  assert.deepEqual(getAvailablePicks(mob), [3]);
});

// ---- recordPick ----

test('recordPick: records valid pick and flips awaitingSide (exchange 1: first → second)', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(recordPick(combat, 'first', 1), true);
  assert.equal(combat.exchanges[0].picks.first, 1);
  assert.equal(combat.awaitingSide, 'second');

  assert.equal(recordPick(combat, 'second', 3), true);
  assert.equal(combat.exchanges[0].picks.second, 3);
});

test('recordPick: exchange 2 order is reversed (second picks before first)', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);
  combat.phase = 'pick2';
  combat.awaitingSide = 'second';

  assert.equal(recordPick(combat, 'second', 2), true);
  assert.equal(combat.exchanges[1].picks.second, 2);
  assert.equal(combat.awaitingSide, 'first');

  assert.equal(recordPick(combat, 'first', 5), true);
  assert.equal(combat.exchanges[1].picks.first, 5);
});

test('recordPick: rejects an unavailable faction', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [0, 4, 0, 0, 0, 0, 0] });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(recordPick(combat, 'first', 3), false);
  assert.equal(combat.exchanges[0].picks.first, null);
  assert.equal(combat.awaitingSide, 'first'); // unchanged on rejection
});

test('recordPick: rejects a repeated faction across exchanges', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(recordPick(combat, 'first', 1), true);
  // Advance to exchange 2 via the phase sequence
  recordPick(combat, 'second', 3);
  combat.phase = 'reveal1';
  advancePhase(combat); // → pick2
  combat.awaitingSide = 'second';
  recordPick(combat, 'second', 2);

  assert.equal(recordPick(combat, 'first', 1), false); // 1 already picked in exchange 1
  assert.equal(combat.exchanges[1].picks.first, null);
});

test('recordPick: rejects a second pick from the same side in one exchange', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(recordPick(combat, 'first', 1), true);
  assert.equal(recordPick(combat, 'first', 2), false);
  assert.equal(combat.exchanges[0].picks.first, 1);
});

test('recordPick: single-faction combatant may repeat its faction in exchange 2', () => {
  // A mob (or a champion with a single potency) has only its own faction
  // available, so the no-repeat guard would make exchange 2 impossible.
  const a = makeChampion({ id: 'a' });
  const mob = makeMob({ id: 'm', faction: 3 });
  const combat = combatOf(a, mob);

  assert.equal(recordPick(combat, 'first', 1), true);
  assert.equal(recordPick(combat, 'second', 3), true);
  // Advance to exchange 2 (second picks first)
  combat.phase = 'reveal1';
  advancePhase(combat); // → pick2
  combat.awaitingSide = 'second';

  assert.equal(recordPick(combat, 'second', 3), true, 'mob may repeat its only faction');
  assert.equal(combat.exchanges[1].picks.second, 3);
});

test('recordPick: exchange-2 completion clears awaitingSide (no flip-back)', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);
  combat.phase = 'pick2';
  combat.awaitingSide = 'second';

  assert.equal(recordPick(combat, 'second', 2), true);
  assert.equal(combat.awaitingSide, 'first');
  assert.equal(recordPick(combat, 'first', 5), true);
  assert.equal(combat.exchanges[1].picks.first, 5);
  assert.equal(combat.awaitingSide, null, 'no side is awaiting once the exchange completes');
});

// ---- bothPicksIn ----

test('bothPicksIn: false until both sides picked, true after', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(bothPicksIn(combat), false);
  recordPick(combat, 'first', 1);
  assert.equal(bothPicksIn(combat), false);
  recordPick(combat, 'second', 3);
  assert.equal(bothPicksIn(combat), true);
});

// ---- advancePhase ----

test('advancePhase: full sequence pick1 → reveal1 → pick2 → reveal2 → roundEnd', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = combatOf(a, b);

  assert.equal(combat.phase, 'pick1');
  assert.equal(combat.awaitingSide, 'first');

  advancePhase(combat);
  assert.equal(combat.phase, 'reveal1');
  assert.equal(combat.awaitingSide, null);

  advancePhase(combat);
  assert.equal(combat.phase, 'pick2');
  assert.equal(combat.awaitingSide, 'second');

  advancePhase(combat);
  assert.equal(combat.phase, 'reveal2');
  assert.equal(combat.awaitingSide, null);

  advancePhase(combat);
  assert.equal(combat.phase, 'roundEnd');
  assert.equal(combat.awaitingSide, null);

  // roundEnd is a no-op
  advancePhase(combat);
  assert.equal(combat.phase, 'roundEnd');
});
