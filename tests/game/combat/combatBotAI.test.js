/**
 * combatBotAI.test.js — Bot pick AI and flee decision logic.
 * (src/game/state/combat/combatBotAI.js)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botCombatPick, shouldBotFlee } from '../../../src/game/state/combat/index.js';
import { makeChampion, makeMob } from '../../helpers/stateFixture.js';

// ---- botCombatPick ----

test('botCombatPick: no revealed intel → highest own potency', () => {
  const champ = makeChampion({ faction: 5, potencies: [2, 0, 0, 0, 0, 9, 0] });
  // potencyWithPrimary: primary 5 stays 9 → available [0, 5]
  assert.equal(botCombatPick(champ, [], [0, 5]), 5);
});

test('botCombatPick: with intel → prefers the faction that beats revealed picks', () => {
  const champ = makeChampion({ faction: 2, potencies: [1, 1, 4, 1, 1, 1, 1] });
  // primary 2 → 5; everything ≥ 1, so all 7 available
  // beats(i, 3) for i in {1, 2, 6} → of those, index 2 has the highest potency (5)
  assert.equal(botCombatPick(champ, [3], [0, 1, 2, 3, 4, 5, 6]), 2);
});

test('botCombatPick: tie-breaks beat winners by own potency', () => {
  const champ = makeChampion({ faction: 1, potencies: [1, 9, 1, 9, 1, 1, 1] });
  // primary 1 → 10 → pot [1,10,1,9,1,1,1]; winners vs 3: {1,2,6} → 1 (pot 10) wins
  assert.equal(botCombatPick(champ, [3], [0, 1, 2, 3, 4, 5, 6]), 1);
});

test('botCombatPick: tie-breaks equal-potency beat winners by faction index', () => {
  const champ = makeChampion({ faction: 4, potencies: [2, 2, 2, 2, 9, 2, 2] });
  // primary 4 → 11; winners vs 3: {1,2,6} all potency 2 → lowest index wins
  assert.equal(botCombatPick(champ, [3], [0, 1, 2, 3, 4, 5, 6]), 1);
});

// ---- shouldBotFlee ----

function combatAt(entity, opponent, round, roundScores) {
  return {
    attacker: entity,
    defender: opponent,
    round,
    roundScores,
  };
}

test('shouldBotFlee: false for null or dead entities', () => {
  const champ = makeChampion({ id: 'a' });
  const mob = makeMob({ id: 'b' });
  const combat = combatAt(champ, mob, 2, { attacker: 0, defender: 10 });
  assert.equal(shouldBotFlee(null, combat), false);
  assert.equal(shouldBotFlee({ ...champ, alive: false }, combat), false);
});

test('shouldBotFlee: never before round 2 completes', () => {
  const champ = makeChampion({ id: 'a' });
  const mob = makeMob({ id: 'b' });
  const combat = combatAt(champ, mob, 1, { attacker: 0, defender: 10 });
  assert.equal(shouldBotFlee(champ, combat), false);
  assert.equal(shouldBotFlee(mob, combat), false);
});

test('shouldBotFlee: never for a human-controlled champion', () => {
  const human = makeChampion({ id: 'a', controller: 'human' });
  const mob = makeMob({ id: 'b' });
  const combat = combatAt(human, mob, 2, { attacker: 0, defender: 10 });
  assert.equal(shouldBotFlee(human, combat), false);
});

test('shouldBotFlee: mobs flee after a lost round', () => {
  const mobA = makeMob({ id: 'a' });
  const mobB = makeMob({ id: 'b' });
  // attacker (mobA) lost: defender 10 > attacker 3
  const combat = combatAt(mobA, mobB, 2, { attacker: 3, defender: 10 });
  assert.equal(shouldBotFlee(mobA, combat), true);
  // The winner (mobB) does not flee
  assert.equal(shouldBotFlee(mobB, combat), false);
});

test('shouldBotFlee: champions flee only when another round would be lethal', () => {
  const champA = makeChampion({ id: 'a', hp: 4, maxHp: 10 });
  const champB = makeChampion({ id: 'b', hp: 20, maxHp: 20 });
  const combat = combatAt(champA, champB, 2, { attacker: 2, defender: 10 });
  // champA lost; damageFromRound 8 ≥ hp 4 → lethal → flee
  assert.equal(shouldBotFlee(champA, combat), true);
  // champB won → no flee
  assert.equal(shouldBotFlee(champB, combat), false);
});

test('shouldBotFlee: champion with enough HP keeps fighting', () => {
  const champA = makeChampion({ id: 'a', hp: 12, maxHp: 20 });
  const champB = makeChampion({ id: 'b', hp: 20, maxHp: 20 });
  const combat = combatAt(champA, champB, 2, { attacker: 2, defender: 10 });
  // lost, but 12 > 8 → not yet lethal
  assert.equal(shouldBotFlee(champA, combat), false);
});
