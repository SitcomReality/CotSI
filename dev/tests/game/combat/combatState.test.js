/**
 * combatState.test.js — Combat state factory, initiative derivation, side mapping.
 * (src/game/state/combat/combatState.js)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOrder,
  createCombatState,
  sideOf,
  entityFor,
  getActiveCombatant,
  isPickingPhase,
  isRevealPhase,
} from '../../../../src/game/state/combat/index.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';

// ---- deriveOrder ----

test('deriveOrder: both champions → earlier globalOrder index is first', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const state = makeState({ globalOrder: ['a', 'b'] });
  assert.deepEqual(deriveOrder(state, a, b), { first: a, second: b });
  // Reverse attack direction — order still follows globalOrder
  assert.deepEqual(deriveOrder(state, b, a), { first: a, second: b });
});

test('deriveOrder: champion vs mob → champion is first regardless of attack direction', () => {
  const champ = makeChampion({ id: 'c' });
  const mob = makeMob({ id: 'm' });
  const state = makeState({ globalOrder: ['c'] });
  assert.deepEqual(deriveOrder(state, champ, mob), { first: champ, second: mob });
  assert.deepEqual(deriveOrder(state, mob, champ), { first: champ, second: mob });
});

test('deriveOrder: mob vs champion → champion is first', () => {
  const champ = makeChampion({ id: 'c' });
  const mob = makeMob({ id: 'm' });
  const state = makeState({ globalOrder: ['c'] });
  assert.deepEqual(deriveOrder(state, mob, champ), { first: champ, second: mob });
});

test('deriveOrder: mob vs mob → attacker-first deterministic fallback', () => {
  const m1 = makeMob({ id: 'm1' });
  const m2 = makeMob({ id: 'm2' });
  const state = makeState({ globalOrder: [] });
  assert.deepEqual(deriveOrder(state, m1, m2), { first: m1, second: m2 });
  assert.deepEqual(deriveOrder(state, m2, m1), { first: m2, second: m1 });
});

// ---- createCombatState ----

test('createCombatState: initial shape and derived order', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const state = makeState({ globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);

  assert.equal(combat.attacker, a);
  assert.equal(combat.defender, b);
  assert.equal(combat.first, a);
  assert.equal(combat.second, b);
  assert.equal(combat.round, 1);
  assert.equal(combat.phase, 'pick1');
  assert.equal(combat.awaitingSide, 'first');
  assert.deepEqual(combat.roundScores, { attacker: 0, defender: 0 });
  assert.deepEqual(combat.exchanges, [
    { picks: { first: null, second: null } },
    { picks: { first: null, second: null } },
  ]);
  assert.deepEqual(combat.combatLog, []);
  assert.equal(combat.lastReveal, null);
});

// ---- sideOf / entityFor ----

test('sideOf: object identity, then id fallback, then null', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = createCombatState(makeState({ globalOrder: ['a', 'b'] }), a, b);

  assert.equal(sideOf(combat, a), 'first');
  assert.equal(sideOf(combat, b), 'second');
  // Same id, different object → resolves by id
  assert.equal(sideOf(combat, { id: 'a' }), 'first');
  // Unknown entity
  assert.equal(sideOf(combat, makeChampion({ id: 'zzz' })), null);
});

test('entityFor: maps sides to entities, invalid side → null', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = createCombatState(makeState({ globalOrder: ['a', 'b'] }), a, b);

  assert.equal(entityFor(combat, 'first'), a);
  assert.equal(entityFor(combat, 'second'), b);
  assert.equal(entityFor(combat, 'nope'), null);
});

test('getActiveCombatant: follows awaitingSide', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = createCombatState(makeState({ globalOrder: ['a', 'b'] }), a, b);

  assert.equal(getActiveCombatant(combat), a); // awaitingSide 'first'
  combat.awaitingSide = 'second';
  assert.equal(getActiveCombatant(combat), b);
  combat.awaitingSide = null;
  assert.equal(getActiveCombatant(combat), null);
});

// ---- phase predicates ----

test('isPickingPhase / isRevealPhase', () => {
  const a = makeChampion({ id: 'a' });
  const b = makeChampion({ id: 'b' });
  const combat = createCombatState(makeState({ globalOrder: ['a', 'b'] }), a, b);

  for (const phase of ['pick1', 'pick2']) {
    combat.phase = phase;
    assert.equal(isPickingPhase(combat), true, phase);
    assert.equal(isRevealPhase(combat), false, phase);
  }
  for (const phase of ['reveal1', 'reveal2']) {
    combat.phase = phase;
    assert.equal(isRevealPhase(combat), true, phase);
    assert.equal(isPickingPhase(combat), false, phase);
  }
  combat.phase = 'roundEnd';
  assert.equal(isPickingPhase(combat), false);
  assert.equal(isRevealPhase(combat), false);
});
