/**
 * paleyScoring.test.js — Paley 7-node tournament invariants
 * (src/game/rules/paleyScoring.js + factionData.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePower } from '../../src/game/rules/paleyScoring.js';
import { beats, BEATS_MATRIX, PALEY_CYCLES, FACTIONS, potencyWithPrimary } from '../../src/game/rules/factionData.js';
import { PALEY_SCORE_MULTI_2_WINS, PALEY_SCORE_MULTI_1_WIN } from '../../src/params/game/combatParams.js';

test('beats: each power beats exactly 3 and loses to exactly 3 of the other 6', () => {
  for (let p = 0; p < 7; p++) {
    const wins = [];
    const losses = [];
    for (let op = 0; op < 7; op++) {
      if (op === p) continue;
      if (beats(p, op)) wins.push(op);
      else losses.push(op);
    }
    assert.equal(wins.length, 3, `power ${p} should beat exactly 3`);
    assert.equal(losses.length, 3, `power ${p} should lose to exactly 3`);
  }
});

test('beats: no self-beating', () => {
  for (let p = 0; p < 7; p++) {
    assert.equal(beats(p, p), false);
  }
});

test('BEATS_MATRIX: antisymmetric — exactly one of (a beats b) / (b beats a)', () => {
  for (let a = 0; a < 7; a++) {
    for (let b = 0; b < 7; b++) {
      if (a === b) {
        assert.equal(BEATS_MATRIX[a][b], false);
        continue;
      }
      assert.equal(BEATS_MATRIX[a][b] === BEATS_MATRIX[b][a], false,
        `pair (${a},${b}) must be antisymmetric`);
      assert.equal(BEATS_MATRIX[a][b] || BEATS_MATRIX[b][a], true,
        `pair (${a},${b}) must have a winner`);
    }
  }
});

test('BEATS_MATRIX matches beats() exactly', () => {
  for (let a = 0; a < 7; a++) {
    for (let b = 0; b < 7; b++) {
      assert.equal(BEATS_MATRIX[a][b], beats(a, b));
    }
  }
});

test('scorePower: 2 wins → potency × MULTI_2_WINS', () => {
  const potencies = [1, 2, 5];
  for (const potency of potencies) {
    // Power 0 beats {1, 2, 4}; pick opponents {1, 2, 3} → wins vs 1,2 = 2 wins.
    const score = scorePower(0, potency, [1, 2, 3]);
    assert.equal(score, potency * PALEY_SCORE_MULTI_2_WINS);
  }
});

test('scorePower: 1 win → floor(potency × MULTI_1_WIN)', () => {
  // Power 0 beats {1, 2, 4}; opponents {1, 3, 5} → 1 win (vs 1).
  assert.equal(scorePower(0, 4, [1, 3, 5]), Math.floor(4 * PALEY_SCORE_MULTI_1_WIN));
  assert.equal(scorePower(0, 2, [1, 3, 5]), Math.floor(2 * PALEY_SCORE_MULTI_1_WIN));
});

test('scorePower: 0 wins → potency', () => {
  // Power 0 vs opponents it loses to: {3, 5, 6}.
  assert.equal(scorePower(0, 7, [3, 5, 6]), 7);
});

test('PALEY_CYCLES: 48 cycles, each a permutation of 0..6', () => {
  assert.equal(PALEY_CYCLES.length, 48);
  for (const cycle of PALEY_CYCLES) {
    assert.equal(cycle.length, 7);
    const sorted = [...cycle].sort((a, b) => a - b);
    assert.deepEqual(sorted, [0, 1, 2, 3, 4, 5, 6], `cycle ${cycle} must be a permutation`);
  }
});

test('PALEY_CYCLES: first 24 are CW — cycle[i] beats cycle[i+1]', () => {
  for (const cycle of PALEY_CYCLES.slice(0, 24)) {
    for (let i = 0; i < 7; i++) {
      assert.equal(beats(cycle[i], cycle[(i + 1) % 7]), true,
        `CW cycle ${cycle}: cycle[${i}] should beat next`);
    }
  }
});

test('PALEY_CYCLES: last 24 are CCW — cycle[i+1] beats cycle[i]', () => {
  for (const cycle of PALEY_CYCLES.slice(24)) {
    for (let i = 0; i < 7; i++) {
      assert.equal(beats(cycle[(i + 1) % 7], cycle[i]), true,
        `CCW cycle ${cycle}: next should beat cycle[${i}]`);
    }
  }
});

test('FACTIONS: exactly 7 factions with unique ids', () => {
  assert.equal(FACTIONS.length, 7);
  const ids = new Set(FACTIONS.map((f) => f.id));
  assert.equal(ids.size, 7);
  for (const f of FACTIONS) {
    assert.ok(f.id >= 0 && f.id < 7);
    assert.ok(f.name && f.short, `faction ${f.id} missing name/short`);
    assert.ok(f.color, `faction ${f.id} missing color`);
  }
});

test('potencyWithPrimary: boosts primary by weakest non-primary potency', () => {
  const champ = { faction: 2, potencies: [1, 3, 0, 2, 4, 1, 2] };
  const result = potencyWithPrimary(champ);
  // Weakest non-primary potency is 1 (at index 0 and 5); primary starts at 0.
  assert.equal(result[2], 1, 'primary should gain the weakest non-primary potency');
  assert.equal(result.length, 7);
});

test('potencyWithPrimary: empty potencies array → all zeros (weakest is 0)', () => {
  // [] is truthy, so the padding path runs; weakest non-primary is 0, so the
  // primary boost is +0. (The 5-primary fallback only fires for undefined.)
  const result = potencyWithPrimary({ faction: 0, potencies: [] });
  assert.deepEqual(result, [0, 0, 0, 0, 0, 0, 0]);
});

test('potencyWithPrimary: missing potencies → fallback array', () => {
  const result = potencyWithPrimary({ faction: 3 });
  assert.deepEqual(result, [0, 0, 0, 5, 0, 0, 0]);
});
