/**
 * forgeSystem.test.js — Equipment upgrades at Forge hexes
 * (src/game/state/features/forgeSystem.js + arrival routing).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgeUpgradeChoices, offerForgeUpgrade, applyForgeUpgrade } from '../../../../src/game/state/features/forgeSystem.js';
import { interactOnArrival } from '../../../../src/game/state/features/arrivalInteractions.js';
import { applyFeatureChoice } from '../../../../src/game/state/features/featureRewards.js';
import { EQUIPMENT_CATALOG } from '../../../../src/game/rules/equipment.js';
import { FORGE_KNOT_COST, FORGE_BONUS_STEP } from '../../../../src/params/game/economyParams.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';

const weapon = () => EQUIPMENT_CATALOG.find((i) => i.id === 'eq-thorn-brand'); // attack +1
const armor = () => EQUIPMENT_CATALOG.find((i) => i.id === 'eq-hearth-robe'); // defense +1

function forgeState(champOverrides = {}) {
  const champ = makeChampion({ id: 'cA', controller: 'human', pos: { q: 0, r: 0 }, ...champOverrides });
  const state = makeState({ champions: [champ], tiles: { '0,0': makeTile('plains', { feature: { kind: 'forge' } }) } });
  return { champ, state };
}

test('forgeUpgradeChoices: one card per eligible slot, none without knots or items', () => {
  const champ = makeChampion({ id: 'cA', knot: FORGE_KNOT_COST, weapon: weapon(), armor: armor() });
  const cards = forgeUpgradeChoices(champ);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((c) => c.grant.slot).sort(), ['armor', 'weapon']);

  assert.deepEqual(forgeUpgradeChoices(makeChampion({ id: 'cB', knot: FORGE_KNOT_COST })), [], 'no items → no cards');
  const poor = makeChampion({ id: 'cC', knot: FORGE_KNOT_COST - 1, weapon: weapon() });
  assert.deepEqual(forgeUpgradeChoices(poor), [], 'not enough knots → no cards');
});

test('offerForgeUpgrade: human arrival at a forge sets a feature reward choice', () => {
  const { champ, state } = forgeState({ knot: FORGE_KNOT_COST, weapon: weapon() });

  offerForgeUpgrade(state, champ);

  assert.equal(state.reward.type, 'feature');
  assert.equal(state.reward.tileKey, '0,0');
  assert.deepEqual(state.reward.guaranteed, []);
  assert.equal(state.reward.choices[0].grant.kind, 'upgrade-equipment');
});

test('applyForgeUpgrade: spends knots, clones the item with a raised bonus', () => {
  const champ = makeChampion({ id: 'cA', knot: 5, weapon: weapon() });
  const state = makeState({ champions: [champ] });
  const beforeBonus = champ.weapon.bonus.attack;

  applyForgeUpgrade(state, champ, { kind: 'upgrade-equipment', slot: 'weapon' });

  assert.equal(champ.knot, 5 - FORGE_KNOT_COST);
  assert.notEqual(champ.weapon, weapon(), 'item is a clone, not the catalog object');
  assert.equal(champ.weapon.bonus.attack, beforeBonus + FORGE_BONUS_STEP);
  assert.equal(champ.weapon.upgradeLevel, 1);
});

test('interactOnArrival: bot champions and empty-handed humans ignore forges', () => {
  const bot = forgeState({ controller: 'bot', knot: FORGE_KNOT_COST, weapon: weapon() });
  interactOnArrival(bot.state, bot.champ);
  assert.equal(bot.state.reward, null);

  const broke = forgeState({ knot: 0, weapon: weapon() });
  interactOnArrival(broke.state, broke.champ);
  assert.equal(broke.state.reward, null);
});

test('applying the upgrade choice keeps the Forge on the tile', () => {
  const { champ, state } = forgeState({ knot: FORGE_KNOT_COST, weapon: weapon() });
  offerForgeUpgrade(state, champ);

  applyFeatureChoice(state, champ, state.reward.choices[0], state.reward.tileKey);

  assert.equal(state.tiles['0,0'].feature.kind, 'forge', 'forge is permanent infrastructure');
  assert.equal(champ.weapon.upgradeLevel, 1);
});
