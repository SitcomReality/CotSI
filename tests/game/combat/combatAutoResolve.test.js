/**
 * combatAutoResolve.test.js — Silent bot-vs-bot combat resolution.
 * (src/game/state/combat/combatAutoResolve.js)
 *
 * The flagship integration tests: full seeded fights through picking,
 * scoring, damage, flee, death, and loot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCombatSilently } from '../../../src/game/state/combat/combatAutoResolve.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';
import {
  AUTO_RESOLVE_MAX_ROUNDS,
  LOOT_GOLD_BASE,
  LOOT_GOLD_RANGE,
} from '../../../src/params/game/combatParams.js';

/**
 * Mob-vs-mob fights score only exchange 1: a mob's only available faction is its
 * own, so its exchange-2 pick is rejected as a repeat. Each round therefore
 * contributes exactly one pair score.
 *
 * Round math for the two mob tests below:
 *   - mA (faction 0/Crucible, potency 5 at 0) vs mB (faction 3, potency 5 at 3)
 *   - exchange 1: beats(0,3) = no → mA 5; beats(3,0) = yes → mB floor(7.5) = 7
 *   - round bonuses: Crucible −1 to mB's score; weather.score[3] = +4 to mB
 *   - damage each round: mB 10 − mA 5 = 5
 */
test('autoResolve: mob flees on round 2 without double-applying damage', () => {
  const mobA = makeMob({ id: 'mA', faction: 0, hp: 12, maxHp: 12, pos: { q: 0, r: 0 } });
  const mobB = makeMob({ id: 'mB', faction: 3, hp: 20, maxHp: 20, pos: { q: 1, r: 0 } });
  const state = makeState({
    mobs: [mobA, mobB],
    weather: { potency: Array(7).fill(0), score: [0, 0, 0, 4, 0, 0, 0] },
  });

  const result = resolveCombatSilently(state, mobA, mobB);

  // Round 1: 5 damage → mA 7 HP. Round 2: mA lost again → flees BEFORE damage,
  // taking the round's 5 damage exactly once → 2 HP. (The old code applied the
  // round damage AND the flee damage with re-bonused scores, leaving mA at 1.)
  assert.deepEqual(result, { winner: null, loser: null, rounds: 2, fled: 'attacker' });
  assert.equal(mobA.alive, true);
  assert.equal(mobA.hp, 2, 'round damage applied exactly once');
  assert.equal(mobB.alive, true);
  assert.equal(mobB.hp, 20, 'winner never damaged');
});

test('autoResolve: champion flees instead of dying when the next round is lethal', () => {
  const champA = makeChampion({
    id: 'cA',
    faction: 3,
    potencies: [1, 1, 1, 7, 1, 1, 1], // primary 3 → 8
    hp: 8,
    maxHp: 8,
    pos: { q: 0, r: 0 },
  });
  const champB = makeChampion({
    id: 'cB',
    faction: 1,
    potencies: [1, 7, 1, 1, 1, 1, 1], // primary 1 → 8
    hp: 20,
    maxHp: 20,
    pos: { q: 1, r: 0 },
  });
  const state = makeState({ champions: [champA, champB], globalOrder: [champA.id, champB.id] });

  const result = resolveCombatSilently(state, champA, champB);

  // Round 1: cA loses 8–12 (4 damage) → 4 HP. Round 2: cA lost again and
  // 4 ≤ 4 → flees BEFORE the lethal blow, taking capped damage → 1 HP.
  // (Old code applied round-2 damage first and killed cA outright.)
  assert.deepEqual(result, { winner: null, loser: null, rounds: 2, fled: 'attacker' });
  assert.equal(champA.alive, true);
  assert.equal(champA.hp, 1, 'flee capped at 1 HP instead of dying');
  assert.equal(champB.alive, true);
  assert.equal(champB.hp, 20);
});

test('autoResolve: lethal round-1 damage kills before flee is possible', () => {
  const mobA = makeMob({ id: 'mA', faction: 0, hp: 2, maxHp: 2, pos: { q: 0, r: 0 } });
  const mobB = makeMob({ id: 'mB', faction: 3, hp: 20, maxHp: 20, pos: { q: 1, r: 0 } });
  const state = makeState({
    mobs: [mobA, mobB],
    weather: { potency: Array(7).fill(0), score: [0, 0, 0, 4, 0, 0, 0] },
  });

  const result = resolveCombatSilently(state, mobA, mobB);

  assert.equal(result.winner, mobB);
  assert.equal(result.loser, mobA);
  assert.equal(result.rounds, 1);
  assert.equal(mobA.alive, false);
  assert.equal(mobB.alive, true);
});

test('autoResolve: champion kills a mob on round 1 and collects loot', () => {
  const champ = makeChampion({
    id: 'cA',
    faction: 1,
    potencies: [1, 6, 1, 1, 1, 1, 1], // primary 1 → 7
    hp: 10,
    maxHp: 10,
    pos: { q: 0, r: 0 },
  });
  const mob = makeMob({ id: 'mM', faction: 3, hp: 3, maxHp: 3, lootGold: 5, pos: { q: 1, r: 0 } });
  const state = makeState({ champions: [champ], mobs: [mob], globalOrder: [champ.id] });

  const result = resolveCombatSilently(state, champ, mob);

  // Exchange 1: cA picks 1 (pot 7, beats 3 → floor(10.5) = 10), mob 5 → 5 damage kills.
  assert.equal(result.winner, champ);
  assert.equal(result.loser, mob);
  assert.equal(result.rounds, 1);
  assert.equal(mob.alive, false);
  assert.equal(champ.alive, true);
  assert.equal(champ.gold, 5, 'mob lootGold collected');
  assert.equal(champ.relics, 1);
});

test('autoResolve: champion-vs-champion death records the loser and loots the winner', () => {
  const champA = makeChampion({
    id: 'cA',
    faction: 1,
    potencies: [0, 9, 0, 0, 0, 0, 0], // primary 1 → 9
    hp: 10,
    maxHp: 10,
    pos: { q: 0, r: 0 },
  });
  const champB = makeChampion({
    id: 'cB',
    faction: 3,
    potencies: [0, 0, 0, 9, 0, 0, 0], // primary 3 → 9
    hp: 3,
    maxHp: 3,
    pos: { q: 1, r: 0 },
  });
  const state = makeState({ champions: [champA, champB], globalOrder: [champA.id, champB.id] });

  const result = resolveCombatSilently(state, champA, champB);

  // Both only pick their primary: cA 1 (beats 3 → 13), cB 3 (9). 26–18 → 8 damage kills.
  assert.equal(result.winner, champA);
  assert.equal(result.loser, champB);
  assert.equal(result.rounds, 1);
  assert.equal(champB.alive, false);
  assert.deepEqual(state.deathOrder, ['cB']);
  assert.equal(state.deathEvent.deadChamps[0].championId, 'cB');
  // Loot rolled from state._rng (0.5): base + floor(0.5 × range)
  assert.equal(champA.gold, LOOT_GOLD_BASE + Math.floor(0.5 * LOOT_GOLD_RANGE));
  assert.equal(champA.relics, 1);
});

test('autoResolve: unresolvable standoff ends in a draw at the round cap', () => {
  // Both champions can only ever pick faction 2, which ties 8–8 every exchange.
  const champA = makeChampion({
    id: 'cA',
    faction: 2,
    potencies: [0, 0, 8, 0, 0, 0, 0],
    hp: 10,
    maxHp: 10,
    pos: { q: 0, r: 0 },
  });
  const champB = makeChampion({
    id: 'cB',
    faction: 6,
    potencies: [0, 0, 8, 0, 0, 0, 0],
    hp: 10,
    maxHp: 10,
    pos: { q: 1, r: 0 },
  });
  const state = makeState({ champions: [champA, champB], globalOrder: [champA.id, champB.id] });

  const result = resolveCombatSilently(state, champA, champB);

  assert.equal(result.rounds, AUTO_RESOLVE_MAX_ROUNDS);
  assert.equal(result.winner, null);
  assert.equal(result.loser, null);
  assert.equal(champA.alive, true);
  assert.equal(champB.alive, true);
  assert.equal(champA.hp, 10);
  assert.equal(champB.hp, 10);
});
