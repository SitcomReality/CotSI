/**
 * digSystem.test.js — Pending dig resolution and dig eligibility
 * (src/game/state/digSystem.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePendingDig, isDigEligible } from '../../../../src/game/state/digSystem.js';
import { makeChampion, makeMob, makeState, makeTile } from '../../helpers/stateFixture.js';

/** Sequence-driven RNG: returns queued values in order, then 0.5. */
function seqRng(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0.5);
}

test('isDigEligible: passable empty tile with no recent combat', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const state = makeState({ champions: [champ], tiles: { '0,0': makeTile() } });
  assert.equal(isDigEligible(state, champ), true);
});

test('isDigEligible: false for feature, mob, combat, and impassable terrain', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 } });
  const mob = makeMob({ id: 'mA', pos: { q: 1, r: 0 } });
  const tiles = {
    '0,0': makeTile(),
    '1,0': makeTile(),
    '2,0': makeTile('plains', { feature: { kind: 'tree' } }),
    '3,0': makeTile('mountain'),
  };
  const base = makeState({ champions: [champ], mobs: [mob], tiles });

  assert.equal(isDigEligible(base, makeChampion({ id: 'cB', pos: { q: 1, r: 0 } })), false, 'mob on tile');
  assert.equal(isDigEligible(base, makeChampion({ id: 'cC', pos: { q: 2, r: 0 } })), false, 'feature on tile');
  assert.equal(isDigEligible(base, makeChampion({ id: 'cD', pos: { q: 3, r: 0 } })), false, 'impassable terrain');
  assert.equal(
    isDigEligible(base, makeChampion({ id: 'cE', pos: { q: 0, r: 0 }, lastActionCombat: true })),
    false,
    'recent combat blocks digging'
  );
});

test('resolvePendingDig: relic branch bumps relics, clears pending, logs', () => {
  const champ = makeChampion({ id: 'cA', pos: { q: 0, r: 0 }, pendingDig: true });
  const state = makeState({ champions: [champ], _rng: seqRng([0.01]) });

  resolvePendingDig(state, champ);

  assert.equal(champ.pendingDig, false);
  assert.equal(champ.relics, 1);
  assert.equal(state.logs[0].category, 'economy');
  assert.ok(state.logs[0].plainText.includes('a relic'));
  assert.equal(state.reward, null, 'bots get no reward modal');
});

test('resolvePendingDig: human relic dig sets the treasure reward + ledger', () => {
  const champ = makeChampion({ id: 'cA', controller: 'human', pendingDig: true });
  const state = makeState({ champions: [champ], _rng: seqRng([0.01]) });

  resolvePendingDig(state, champ);

  assert.equal(champ.relics, 1);
  assert.equal(state.reward.championId, 'cA');
  assert.equal(state.reward.type, 'treasure');
  assert.equal(champ.dispatchLedger.length, 1);
  assert.equal(champ.dispatchLedger[0].sign, 'gain');
  assert.equal(champ.dispatchLedger[0].type, 'relic');
});

test('resolvePendingDig: Everknown relic dig also wakes a random potency', () => {
  const champ = makeChampion({ id: 'cA', faction: 3, pendingDig: true });
  const state = makeState({ champions: [champ], _rng: seqRng([0.01, 0.5]) });

  resolvePendingDig(state, champ);

  assert.equal(champ.relics, 1);
  assert.equal(champ.potencies[3], 2, 'random faction 3 (floor 0.5 × 7) gained potency');
});

test('resolvePendingDig: potency branch gains a random faction potency', () => {
  const champ = makeChampion({ id: 'cA', pendingDig: true });
  const state = makeState({ champions: [champ], _rng: seqRng([0.1, 0.5]) });

  resolvePendingDig(state, champ);

  assert.equal(champ.relics, 0);
  assert.equal(champ.potencies[3], 2, 'potency 3 bumped (floor 0.5 × 7)');
  assert.ok(state.logs[0].plainText.includes('Archive potency'));
  assert.equal(state.reward, null);
});

test('resolvePendingDig: gold branch grants base + roll + day scaling', () => {
  const champ = makeChampion({ id: 'cA', pendingDig: true, gold: 0 });
  const state = makeState({ champions: [champ], day: 1, _rng: seqRng([0.5, 0.5]) });

  resolvePendingDig(state, champ);

  // 7 + floor(0.5 × 12) + floor(1 / 7) = 7 + 6 + 0
  assert.equal(champ.gold, 13);
  assert.ok(state.logs[0].plainText.includes('13 gold'));
  assert.equal(state.reward, null);
});

test('resolvePendingDig: gold scales with the day divisor', () => {
  const champ = makeChampion({ id: 'cA', pendingDig: true, gold: 0 });
  const state = makeState({ champions: [champ], day: 15, _rng: seqRng([0.5, 0.5]) });

  resolvePendingDig(state, champ);

  // 7 + floor(0.5 × 12) + floor(15 / 7) = 7 + 6 + 2
  assert.equal(champ.gold, 15);
});
