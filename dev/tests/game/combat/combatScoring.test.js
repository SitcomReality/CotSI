/**
 * combatScoring.test.js — Pair scoring, final bonuses, reveal processing.
 * (src/game/state/combat/combatScoring.js)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scorePickPair,
  applyFinalBonuses,
  processReveal,
  createCombatState,
  recordPick,
} from '../../../../src/game/state/combat/index.js';
import { makeChampion, makeMob, makeState } from '../../helpers/stateFixture.js';

// ---- scorePickPair ----

test('scorePickPair: applies weather potency mods and Paley win multiplier', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [1, 6, 1, 1, 1, 1, 1] }); // primary 1 → 7
  const b = makeChampion({ id: 'b', faction: 3, potencies: [1, 1, 1, 6, 1, 1, 1] }); // primary 3 → 7
  const state = makeState({
    weather: { potency: [0, 2, 0, -1, 0, 0, 0], score: Array(7).fill(0) },
  });

  const result = scorePickPair(state, a, b, 1, 3);

  // beats(1,3) → 1.5× floor(9 × 1.5) = 13; beats(3,1) → no multiplier → 6
  assert.equal(result.scoreA, 13);
  assert.equal(result.scoreB, 6);
  assert.equal(result.potA, 9);
  assert.equal(result.potB, 6);
  assert.match(result.logA, /9→13/);
  assert.match(result.logB, /6→6/);
});

test('scorePickPair: potency clamped at 0 by heavy negative weather', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [1, 6, 1, 1, 1, 1, 1] });
  const b = makeChampion({ id: 'b', faction: 3, potencies: [1, 1, 1, 6, 1, 1, 1] });
  const state = makeState({
    weather: { potency: [0, -20, 0, 0, 0, 0, 0], score: Array(7).fill(0) },
  });

  const result = scorePickPair(state, a, b, 1, 3);

  assert.equal(result.potA, 0);
  assert.equal(result.scoreA, 0);
});

// ---- applyFinalBonuses ----

test('applyFinalBonuses: crucible weekly penalty, weather, margin, hollow', () => {
  // A is Crucible (faction 0) with the margin artifact; B is Hollow (faction 6)
  const a = makeChampion({ id: 'a', faction: 0, artifact: 'margin', hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', faction: 6, hp: 5, maxHp: 35 });
  const state = makeState({
    day: 15, // week = floor(14/7)+1 = 3
    weather: { potency: Array(7).fill(0), score: [0, 0, 0, 0, 0, 0, 1] },
  });

  const result = applyFinalBonuses(state, a, b, 10, 20);

  // Crucible: B's score −3 → 17
  // A: weather.score[0]=0 + margin +2 → +2 → 12
  // B: weather.score[6]=1 + hollow (⌈30/10⌉=3 × ⌈3/3⌉=1) +3 → +4 → 21
  assert.deepEqual(result, { scoreA: 12, scoreB: 21 });
});

test('applyFinalBonuses: never reduces a score below zero via crucible', () => {
  const a = makeChampion({ id: 'a', faction: 0, hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', faction: 3, hp: 10, maxHp: 10 });
  const state = makeState({
    day: 15, // week 3
    weather: { potency: Array(7).fill(0), score: Array(7).fill(0) },
  });

  const result = applyFinalBonuses(state, a, b, 1, 1);
  assert.deepEqual(result, { scoreA: 1, scoreB: 0 });
});

test('applyFinalBonuses: mobs get raw weather score, champions get finalScoreBonus', () => {
  const champ = makeChampion({ id: 'c', faction: 1, hp: 10, maxHp: 10 });
  const mob = makeMob({ id: 'm', faction: 3 });
  const state = makeState({
    weather: { potency: Array(7).fill(0), score: [0, 3, 0, 5, 0, 0, 0] },
  });

  const result = applyFinalBonuses(state, champ, mob, 10, 20);

  // Champion: +weather.score[1]=3 → 13; mob: +weather.score[3]=5 → 25
  assert.deepEqual(result, { scoreA: 13, scoreB: 25 });
});

// ---- processReveal ----

test('processReveal: scores an exchange, accumulates roundScores, builds lastReveal', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [1, 6, 1, 1, 1, 1, 1] }); // primary 1 → 7
  const b = makeChampion({ id: 'b', faction: 3, potencies: [1, 1, 1, 6, 1, 1, 1] }); // primary 3 → 7
  const state = makeState({ globalOrder: [a.id, b.id] });
  const combat = createCombatState(state, a, b);
  recordPick(combat, 'first', 1);
  recordPick(combat, 'second', 3);
  combat.phase = 'reveal1';

  const payload = processReveal(state, combat);

  assert.ok(payload, 'reveal should process');
  // scorePower(1, 7, [3]): beats → floor(10.5) = 10; scorePower(3, 7, [1]): no beat → 7
  assert.equal(combat.roundScores.attacker, 10);
  assert.equal(combat.roundScores.defender, 7);
  assert.deepEqual(payload.runningTotals, { attacker: 10, defender: 7 });
  assert.equal(payload.first.factionIdx, 1);
  assert.equal(payload.first.basePotency, 7);
  assert.equal(payload.first.beats, true);
  assert.equal(payload.first.score, 10);
  assert.equal(payload.second.factionIdx, 3);
  assert.equal(payload.second.beats, false);
  assert.equal(payload.second.score, 7);
  assert.equal(combat.combatLog.length, 1);
  assert.match(combat.combatLog[0], /Reveal 1/);
});

test('processReveal: maps scores correctly when the attacker is the second side', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [1, 6, 1, 1, 1, 1, 1] }); // primary 1 → 7
  const b = makeChampion({ id: 'b', faction: 3, potencies: [1, 1, 1, 6, 1, 1, 1] }); // primary 3 → 7
  // b acts first this time (earlier in globalOrder); a is the attacker
  const state = makeState({ globalOrder: [b.id, a.id] });
  const combat = createCombatState(state, a, b);
  assert.equal(combat.first, b);
  recordPick(combat, 'first', 3); // b picks 3 → 7 pts
  recordPick(combat, 'second', 1); // a picks 1 → 10 pts
  combat.phase = 'reveal1';

  processReveal(state, combat);

  // Attacker (a) is 'second' → its scoreB maps onto roundScores.attacker
  assert.equal(combat.roundScores.attacker, 10);
  assert.equal(combat.roundScores.defender, 7);
});

test('processReveal: returns null when either pick is missing', () => {
  const a = makeChampion({ id: 'a', faction: 1, potencies: [1, 6, 1, 1, 1, 1, 1] });
  const b = makeChampion({ id: 'b', faction: 3, potencies: [1, 1, 1, 6, 1, 1, 1] });
  const state = makeState({ globalOrder: [a.id, b.id] });
  const combat = createCombatState(state, a, b);
  recordPick(combat, 'first', 1);
  combat.phase = 'reveal1';

  assert.equal(processReveal(state, combat), null);
});
