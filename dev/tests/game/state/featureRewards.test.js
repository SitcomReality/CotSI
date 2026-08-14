/**
 * featureRewards.test.js — Feature rewards engine
 * (src/game/state/features/featureRewards.js): direct grants, choice rewards
 * (human modal payload vs bot policy), replenishable regrow, temp buffs,
 * and bot target scoring.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coordKey } from '../../../../src/engine/rules/hexGrid.js';
import '../../../../src/game/rules/archetypeData/features.js'; // registers canonical names
import { interactWithFeature, applyFeatureChoice, botFeatureChoice, featureValueForBot } from '../../../../src/game/state/features/featureRewards.js';
import { interactOnArrival } from '../../../../src/game/state/features/arrivalInteractions.js';
import { makeChampion, makeTile, makeState } from '../../helpers/stateFixture.js';

const HERE = coordKey({ q: 0, r: 0 });

function humanChamp(overrides = {}) {
  return makeChampion({ controller: 'human', hp: 50, maxHp: 100, ...overrides });
}

function stateWith(champ, tile) {
  return makeState({ champions: [champ], tiles: { [HERE]: tile } });
}

// ── Direct finite grants ──────────────────────────────────────────────────────

test('palimpsest slab: grants +1 relic and is consumed', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'palimpsestSlab' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.relics, 1);
  assert.equal(tile.feature, null, 'finite feature consumed');
  assert.equal(state.logs[0].category, 'economy');
  assert.equal(state.logs[0].grammar.object.text, 'a relic from the Palimpsest Slab');
  assert.equal(champ.dispatchLedger.length, 1);
});

test('vegetable lamb: grants knots + heal and is consumed', () => {
  const champ = humanChamp({ hp: 20 });
  const tile = makeTile('plains', { feature: { kind: 'vegetableLamb' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.knot, 2);
  assert.equal(champ.hp, 26, '+6 HP');
  assert.equal(tile.feature, null);
});

test('dustbleed crystal: grants gold + a random potency', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'dustbleedCrystal' } });
  // _rng 0.2 → floor(0.2 * 7) = faction 1 potency.
  const state = makeState({ champions: [champ], tiles: { [HERE]: tile }, _rng: () => 0.2 });

  interactWithFeature(state, champ, tile);

  assert.equal(champ.gold, 10);
  assert.equal(champ.potencies[1], 2, 'random potency landed on faction 1');
  assert.equal(tile.feature, null);
});

test('drowned copyist: grants knots + a defense buff for this turn', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'drownedCopyist' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.knot, 2);
  assert.equal(champ.buffs.defense, 2);
  assert.equal(tile.feature, null);
});

test('scenery and unknown kinds are no-ops', () => {
  for (const kind of ['bush', 'mysteryKind']) {
    const champ = humanChamp();
    const tile = makeTile('plains', { feature: { kind } });
    const state = stateWith(champ, tile);
    interactWithFeature(state, champ, tile);
    assert.equal(champ.gold, 0, `${kind}: nothing granted`);
    assert.equal(champ.hp, 50, `${kind}: nothing granted`);
    assert.ok(tile.feature, `${kind}: feature left in place`);
    assert.equal(state.logs.length, 0, `${kind}: no log`);
  }
});

// ── Replenishable (regrow) ────────────────────────────────────────────────────

test('waxbloom: heals, then goes unripe on a regrow timer', () => {
  const champ = humanChamp({ hp: 30 });
  const tile = makeTile('plains', { feature: { kind: 'waxbloom' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.hp, 40, '+10 HP');
  assert.equal(tile.feature.ripe, false);
  assert.equal(tile.feature.nextRewardDay, 5, 'day 1 + 4 regrow days');
  assert.ok(state._regrowingFeatures.has(HERE));
  assert.ok(tile.feature, 'replenishable feature persists');
});

test('waxbloom: no reward while spent', () => {
  const champ = humanChamp({ hp: 30 });
  const tile = makeTile('plains', { feature: { kind: 'waxbloom', ripe: false, nextRewardDay: 5 } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.hp, 30, 'spent feature grants nothing');
  assert.equal(state.logs.length, 0);
});

test('snowperson: grants +20 AP this turn and regrows', () => {
  const champ = humanChamp({ actionPoints: 0 });
  const tile = makeTile('plains', { feature: { kind: 'snowperson' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.actionPoints, 20, 'AP buff is temporary by construction');
  assert.equal(tile.feature.ripe, false);
});

test("saint's rib: grants +3 defense this turn and regrows", () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'saintsRib' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.buffs.defense, 3);
  assert.equal(tile.feature.ripe, false);
});

test('scoria rose: grants renewable knots and regrows', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'scoriaRose' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.knot, 2);
  assert.equal(tile.feature.ripe, false);
});

test('eden mushroom: heals and regrows on the shared timer', () => {
  const champ = humanChamp({ hp: 30 });
  const tile = makeTile('plains', { feature: { kind: 'edenMushroom' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.hp, 42, '+12 HP');
  assert.equal(tile.feature.ripe, false);
  assert.equal(tile.feature.nextRewardDay, 5, 'day 1 + 4 regrow days');
  assert.ok(state._regrowingFeatures.has(HERE));
});

test('shroomlet: small heal and regrows', () => {
  const champ = humanChamp({ hp: 30 });
  const tile = makeTile('plains', { feature: { kind: 'edenShroomlet' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(champ.hp, 36, '+6 HP');
  assert.equal(tile.feature.ripe, false);
});

// ── Choice rewards — human modal payload ──────────────────────────────────────

test('witness stone: human gets a pending choice reward, feature not yet consumed', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'witnessStone' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(state.reward.type, 'feature');
  assert.equal(state.reward.title, 'Witness-Stone', 'canonical display name');
  assert.equal(state.reward.tileKey, HERE);
  assert.equal(state.reward.choices.length, 2);
  assert.equal(state.reward.choices[0].grant.kind, 'relic');
  assert.equal(state.reward.choices[1].grant.kind, 'gold');
  assert.ok(tile.feature, 'feature consumed only when the choice is applied');
});

test('applyFeatureChoice: grants the chosen reward and consumes the tile', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'witnessStone' } });
  const state = stateWith(champ, tile);
  interactWithFeature(state, champ, tile);

  applyFeatureChoice(state, champ, state.reward.choices[1], state.reward.tileKey);

  assert.equal(champ.gold, 12, 'gold side applied');
  assert.equal(champ.relics, 0);
  assert.equal(tile.feature, null);
  assert.equal(state.logs[0].grammar.verb, 'claims');
  assert.equal(state.logs[0].grammar.object.text, 'a pouch of 12 gold');
});

test('screamroot: risky side grants knots but the HP cost never kills', () => {
  const champ = humanChamp({ hp: 5 });
  const tile = makeTile('plains', { feature: { kind: 'screamroot' } });
  const state = stateWith(champ, tile);
  interactWithFeature(state, champ, tile);
  const risky = state.reward.choices[0];

  applyFeatureChoice(state, champ, risky, state.reward.tileKey);

  assert.equal(champ.knot, 6);
  assert.equal(champ.hp, 1, 'HP cost clamps at 1 — a cost, not an eliminator');
  assert.equal(tile.feature, null);
});

test('screamroot: safe side grants the small knot reward', () => {
  const champ = humanChamp({ hp: 10 });
  const tile = makeTile('plains', { feature: { kind: 'screamroot' } });
  const state = stateWith(champ, tile);
  interactWithFeature(state, champ, tile);

  applyFeatureChoice(state, champ, state.reward.choices[1], state.reward.tileKey);

  assert.equal(champ.knot, 2);
  assert.equal(champ.hp, 10, 'no HP cost');
});

test('gilded initial: attack and defense choices set this-turn buffs', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'gildedInitial' } });
  const state = stateWith(champ, tile);
  interactWithFeature(state, champ, tile);

  applyFeatureChoice(state, champ, state.reward.choices[0], state.reward.tileKey);
  assert.equal(champ.buffs.attack, 3, 'attack side');

  const champ2 = humanChamp();
  const tile2 = makeTile('plains', { feature: { kind: 'gildedInitial' } });
  const state2 = stateWith(champ2, tile2);
  interactWithFeature(state2, champ2, tile2);
  applyFeatureChoice(state2, champ2, state2.reward.choices[1], state2.reward.tileKey);
  assert.equal(champ2.buffs.defense, 3, 'defense side');
});

test('null lily: potency pick offers all seven factions', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'nullLily' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(state.reward.choices.length, 7);
  assert.equal(state.reward.choices[0].grant.kind, 'potency');
  assert.equal(state.reward.choices[0].grant.faction, 0);
  assert.equal(state.reward.choices[6].grant.faction, 6);
});

test('null lily: picking a faction grants exactly that potency', () => {
  const champ = humanChamp();
  const tile = makeTile('plains', { feature: { kind: 'nullLily' } });
  const state = stateWith(champ, tile);
  interactWithFeature(state, champ, tile);

  applyFeatureChoice(state, champ, state.reward.choices[4], state.reward.tileKey);

  assert.equal(champ.potencies[4], 2, 'chosen faction potency incremented');
  assert.equal(tile.feature, null);
});

// ── Choice rewards — bot policy ───────────────────────────────────────────────

test('bot: choice features apply immediately with no state.reward', () => {
  const champ = makeChampion({ controller: 'bot', hp: 80, maxHp: 100 });
  const tile = makeTile('plains', { feature: { kind: 'witnessStone' } });
  const state = stateWith(champ, tile);

  interactWithFeature(state, champ, tile);

  assert.equal(state.reward, null, 'bots never open a modal');
  assert.equal(champ.relics, 1, 'healthy bot takes the relic side');
  assert.equal(tile.feature, null);
});

test('bot: potency-pick grants a potency', () => {
  const champ = makeChampion({ controller: 'bot', hp: 80, maxHp: 100 });
  const tile = makeTile('plains', { feature: { kind: 'volvelle' } });
  const state = makeState({ champions: [champ], tiles: { [HERE]: tile }, _rng: () => 0.2 });

  interactWithFeature(state, champ, tile);

  assert.equal(champ.potencies[1], 2, 'faction from the rng roll');
  assert.equal(state.reward, null);
});

test('botFeatureChoice: screamroot gambles only when healthy', () => {
  const spec = { choices: [1, 2] }; // index is all that matters
  const healthy = makeChampion({ hp: 80, maxHp: 100 });
  const hurt = makeChampion({ hp: 40, maxHp: 100 });
  assert.equal(botFeatureChoice(null, healthy, { feature: { kind: 'screamroot' } }, spec), 0, 'healthy → risky side');
  assert.equal(botFeatureChoice(null, hurt, { feature: { kind: 'screamroot' } }, spec), 1, 'hurt → safe side');
});

test('botFeatureChoice: gilded initial shores up defense when hurt', () => {
  const spec = { choices: [1, 2] };
  const hurt = makeChampion({ hp: 40, maxHp: 100 });
  const healthy = makeChampion({ hp: 90, maxHp: 100 });
  assert.equal(botFeatureChoice(null, hurt, { feature: { kind: 'gildedInitial' } }, spec), 1, 'hurt → defense');
  assert.equal(botFeatureChoice(null, healthy, { feature: { kind: 'gildedInitial' } }, spec), 0, 'healthy → attack');
});

// ── Bot target scoring ────────────────────────────────────────────────────────

test('featureValueForBot: base value, spent gate, and heal bonus', () => {
  const hurt = makeChampion({ hp: 40, maxHp: 100 });

  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'waxbloom' } })), 32,
    'heal kind (22) + injury bonus (10)');
  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'waxbloom', ripe: false } })), 0,
    'spent features are not targets');
  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'treasureChest' } })), 34,
    'treasure chest base value');
  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'bush' } })), 0,
    'scenery is not a target');
  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'unknownKind' } })), 0,
    'unknown kinds are not targets');
});

test('featureValueForBot: edenfall mushrooms count as heal targets when injured', () => {
  const hurt = makeChampion({ hp: 40, maxHp: 100 });

  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'edenMushroom' } })), 34,
    'eden mushroom (24) + injury bonus (10)');
  assert.equal(featureValueForBot(null, hurt, makeTile('plains', { feature: { kind: 'edenShroomlet' } })), 28,
    'shroomlet (18) + injury bonus (10)');
});

// ── Arrival integration ───────────────────────────────────────────────────────

test('interactOnArrival: delegates new kinds to the rewards engine', () => {
  const champ = humanChamp({ hp: 30 });
  const tile = makeTile('plains', { feature: { kind: 'waxbloom' } });
  const state = stateWith(champ, tile);

  interactOnArrival(state, champ);

  assert.equal(champ.hp, 40, 'waxbloom heal routed through the rewards engine');
  assert.equal(tile.feature.ripe, false);
});
