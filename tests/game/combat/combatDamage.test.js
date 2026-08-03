/**
 * combatDamage.test.js — Round damage resolution, turn-order reorder, round advance.
 * (src/game/state/combat/combatDamage.js)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  moveDamagedBeforeDamager,
  resolveRoundDamage,
  nextCombatRound,
} from '../../../src/game/state/combat/combatDamage.js';
import { createCombatState } from '../../../src/game/state/combat/combatState.js';
import { makeChampion, makeState } from '../../helpers/stateFixture.js';

// ---- moveDamagedBeforeDamager ----

test('moveDamagedBeforeDamager: damaged champion moves ahead of damager', () => {
  const state = makeState({ globalOrder: ['a', 'b', 'c'] });
  moveDamagedBeforeDamager(state, 'c', 'a'); // c damaged by a
  assert.deepEqual(state.globalOrder, ['c', 'a', 'b']);
});

test('moveDamagedBeforeDamager: no-op when damaged already acts first', () => {
  const state = makeState({ globalOrder: ['a', 'b', 'c'] });
  moveDamagedBeforeDamager(state, 'a', 'c'); // a damaged by c
  assert.deepEqual(state.globalOrder, ['a', 'b', 'c']);
});

test('moveDamagedBeforeDamager: no-op when either id is missing', () => {
  const state = makeState({ globalOrder: ['a', 'b'] });
  moveDamagedBeforeDamager(state, 'zzz', 'a');
  moveDamagedBeforeDamager(state, 'b', 'zzz');
  assert.deepEqual(state.globalOrder, ['a', 'b']);
});

// ---- resolveRoundDamage ----

test('resolveRoundDamage: attacker wins → defender takes damage and is reordered', () => {
  const a = makeChampion({ id: 'a', hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 10, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 8, defender: 3 };

  const result = resolveRoundDamage(state, combat);

  assert.deepEqual(result, { damage: 5, to: 'defender', attackerDead: false, defenderDead: false });
  assert.equal(b.hp, 5);
  assert.equal(a.hp, 10);
  assert.ok(a.alive && b.alive);
  // Defender reordered ahead of damager
  assert.deepEqual(state.globalOrder, ['b', 'a']);
  // No death recorded
  assert.deepEqual(state.deathOrder, []);
  assert.equal(combat.combatLog.length, 1);
  assert.match(combat.combatLog[0], /takes 5/);
});

test('resolveRoundDamage: defender wins → attacker takes damage and dies (champion death tracked)', () => {
  const a = makeChampion({ id: 'a', hp: 3, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 10, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 2, defender: 9 };

  const result = resolveRoundDamage(state, combat);

  assert.deepEqual(result, { damage: 7, to: 'attacker', attackerDead: true, defenderDead: false });
  assert.equal(a.hp, -4);
  assert.equal(a.alive, false);
  assert.deepEqual(state.deathOrder, ['a']);
  assert.equal(state.deathEvent.deadChamps[0].championId, 'a');
});

test('resolveRoundDamage: tie round deals no damage', () => {
  const a = makeChampion({ id: 'a', hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 10, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 5, defender: 5 };

  const result = resolveRoundDamage(state, combat);

  assert.deepEqual(result, { damage: 0, to: 'none', attackerDead: false, defenderDead: false });
  assert.equal(a.hp, 10);
  assert.equal(b.hp, 10);
  assert.deepEqual(state.globalOrder, ['a', 'b']); // no reorder on a tie
  assert.equal(combat.combatLog.length, 1);
  assert.match(combat.combatLog[0], /neither side takes damage/);
});

test('resolveRoundDamage: double knockout → both recorded dead', () => {
  const a = makeChampion({ id: 'a', hp: 2, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 2, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 6, defender: 9 }; // defender wins: dmg 3 → a dead; attacker loses: dmg 0

  const result = resolveRoundDamage(state, combat);

  // Only the round winner applies damage, so only the attacker dies here
  assert.equal(result.attackerDead, true);
  assert.equal(result.defenderDead, false);
  assert.equal(a.alive, false);
  assert.equal(b.alive, true);
  assert.deepEqual(state.deathOrder, ['a']);
});

test('resolveRoundDamage: mob damage is not reordered (no potencies, not a champion)', () => {
  const champ = makeChampion({ id: 'c', hp: 10, maxHp: 10 });
  const mob = { id: 'm', name: 'Mob', faction: 3, hp: 2, maxHp: 2, alive: true, pos: { q: 1, r: 0 } };
  const state = makeState({ champions: [champ], mobs: [mob], globalOrder: ['c'] });
  const combat = createCombatState(state, champ, mob);
  combat.roundScores = { attacker: 9, defender: 2 };

  const result = resolveRoundDamage(state, combat);

  assert.equal(result.defenderDead, true);
  assert.equal(mob.alive, false);
  // No champion reorder (mob has no potencies), and no death tracked for mobs
  assert.deepEqual(state.globalOrder, ['c']);
  assert.deepEqual(state.deathOrder, []);
});

// ---- nextCombatRound ----

test('nextCombatRound: bumps round and resets round-specific state', () => {
  const a = makeChampion({ id: 'a', hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 10, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 8, defender: 3 };
  combat.lastReveal = { some: 'payload' };
  combat.phase = 'roundEnd';

  nextCombatRound(state, combat);

  assert.equal(combat.round, 2);
  assert.equal(combat.phase, 'pick1');
  assert.equal(combat.awaitingSide, 'first');
  assert.deepEqual(combat.roundScores, { attacker: 0, defender: 0 });
  assert.equal(combat.lastReveal, null);
  assert.deepEqual(combat.exchanges, [
    { picks: { first: null, second: null } },
    { picks: { first: null, second: null } },
  ]);
});

test('nextCombatRound: re-derives first/second after a reorder', () => {
  const a = makeChampion({ id: 'a', hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', hp: 10, maxHp: 10, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [a, b], globalOrder: ['a', 'b'] });
  const combat = createCombatState(state, a, b);
  combat.roundScores = { attacker: 8, defender: 3 };
  resolveRoundDamage(state, combat); // defender reordered ahead → ['b', 'a']
  assert.deepEqual(state.globalOrder, ['b', 'a']);

  nextCombatRound(state, combat);

  assert.equal(combat.first, b);
  assert.equal(combat.second, a);
});
