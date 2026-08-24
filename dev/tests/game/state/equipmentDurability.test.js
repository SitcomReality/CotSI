/**
 * equipmentDurability.test.js — Durability wear, nonfunctionality,
 * replacement refunds, and Forge repairs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipItem } from '../../../../src/game/state/features/trading.js';
import { sellValue, maxDurabilityOf, isFunctional } from '../../../../src/game/rules/equipment.js';
import { EQUIPMENT_CATALOG } from '../../../../src/game/rules/equipment.js';
import { applyFinalBonuses } from '../../../../src/game/state/combat/index.js';
import { beginTurn } from '../../../../src/game/state/turnActions.js';
import { forgeRepairChoices, applyForgeRepair } from '../../../../src/game/state/features/forgeSystem.js';
import { EQUIP_MAX_DURABILITY, EQUIP_DURABILITY_TICK, FORGE_KNOT_COST, FORGE_BONUS_STEP } from '../../../../src/params/game/economyParams.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';

const weapon = () => EQUIPMENT_CATALOG.find((i) => i.id === 'eq-thorn-brand'); // 34g, attack +1

// ---- sellValue / instances ----

test('sellValue: full durability sells for half buy cost, worn scales down, broken is 1', () => {
  const fresh = { ...weapon(), durability: EQUIP_MAX_DURABILITY, maxDurability: EQUIP_MAX_DURABILITY };
  assert.equal(sellValue(fresh), 17); // floor(34 × 0.5)

  const half = { ...fresh, durability: Math.floor(EQUIP_MAX_DURABILITY / 2) };
  assert.equal(sellValue(half), 8); // floor(34 × 0.5 × 0.5)

  const broken = { ...fresh, durability: 0 };
  assert.equal(sellValue(broken), 1);
});

test('sellValue: bare catalog refs (no durability fields) count as full', () => {
  assert.equal(sellValue(weapon()), 17);
});

test('equipItem: replacement pays the old item\'s durability-scaled value; new instance is full', () => {
  const champ = makeChampion({ id: 'cA', gold: 0 });
  champ.weapon = { ...weapon(), durability: 2, maxDurability: EQUIP_MAX_DURABILITY };

  const refund = equipItem(champ, weapon());

  // floor(34 × 0.5 × 0.2) = 3
  assert.equal(refund, 3);
  assert.equal(champ.gold, 3);
  assert.equal(champ.weapon.durability, EQUIP_MAX_DURABILITY, 'freshly equipped item starts at full');
  assert.equal(champ.weapon.maxDurability, EQUIP_MAX_DURABILITY);
});

// ---- wear ----

test('beginTurn: equipped items lose durability, flooring at 0', () => {
  const champ = makeChampion({ id: 'cA' });
  champ.weapon = { ...weapon(), durability: 3, maxDurability: EQUIP_MAX_DURABILITY };
  champ.armor = { ...EQUIPMENT_CATALOG.find((i) => i.id === 'eq-hearth-robe'), durability: 1, maxDurability: EQUIP_MAX_DURABILITY };
  const state = makeState({ champions: [champ], globalOrder: [champ.id] });

  beginTurn(state, champ.id);

  assert.equal(champ.weapon.durability, 3 - EQUIP_DURABILITY_TICK);
  assert.equal(champ.armor.durability, 0);

  beginTurn(state, champ.id);
  assert.equal(champ.armor.durability, 0, 'never goes negative');
});

// ---- nonfunctional ----

test('a 0-durability item stops contributing its bonus in combat', () => {
  const a = makeChampion({ id: 'a', faction: 1, hp: 10, maxHp: 10 });
  const b = makeChampion({ id: 'b', faction: 3, hp: 10, maxHp: 10 });
  a.weapon = { bonus: { attack: 2 }, durability: 0, maxDurability: 5 }; // broken
  a.armor = { bonus: { defense: 4 }, durability: 1, maxDurability: 5 }; // working
  b.weapon = { bonus: { attack: 3 }, durability: null }; // legacy item counts as functional
  const state = makeState({
    weather: { potency: Array(7).fill(0), score: Array(7).fill(0) },
  });

  const result = applyFinalBonuses(state, a, b, 10, 20);

  // A: broken weapon ignored, working armor defense −B's attack? B attack 3 → 10 + 0 − 3... wait:
  // A gets +eqAttack(A)=0, minus eqDefense(B)=0 → 10
  // B gets +eqAttack(B)=3, minus eqDefense(A)=4 → 19
  assert.deepEqual(result, { scoreA: 10, scoreB: 19 });
});

// ---- Forge repairs ----

test('forgeRepairChoices: offers damaged affordable items only', () => {
  const champ = makeChampion({ id: 'cA', gold: 100, knot: FORGE_KNOT_COST });
  const robe = EQUIPMENT_CATALOG.find((i) => i.id === 'eq-hearth-robe'); // 28g
  const blade = EQUIPMENT_CATALOG.find((i) => i.id === 'eq-orichalcum-blade'); // 40g + 2 knots
  champ.weapon = { ...blade, durability: EQUIP_MAX_DURABILITY - 1, maxDurability: EQUIP_MAX_DURABILITY };
  champ.armor = { ...robe, durability: 0, maxDurability: EQUIP_MAX_DURABILITY };
  assert.deepEqual(forgeRepairChoices({ ...champ, gold: 27 }), [], 'cannot afford either repair');

  const cards = forgeRepairChoices(champ);
  assert.deepEqual(cards.map((c) => c.grant.slot).sort(), ['armor', 'weapon']);
  assert.ok(cards.every((c) => c.grant.kind === 'repair-equipment'));
});

test('forgeRepairChoices: full-durability items get no repair card', () => {
  const champ = makeChampion({ id: 'cA', gold: 100, knot: FORGE_KNOT_COST });
  champ.weapon = { ...weapon(), durability: EQUIP_MAX_DURABILITY, maxDurability: EQUIP_MAX_DURABILITY };
  assert.deepEqual(forgeRepairChoices(champ), []);
});

test('applyForgeRepair: restores full durability for the item\'s buy cost', () => {
  const blade = EQUIPMENT_CATALOG.find((i) => i.id === 'eq-orichalcum-blade'); // 40g + 2 knots
  const champ = makeChampion({ id: 'cA', gold: 100, knot: 5 });
  champ.weapon = { ...blade, durability: 0, maxDurability: EQUIP_MAX_DURABILITY };
  const state = makeState({ champions: [champ] });

  const text = applyForgeRepair(state, champ, { kind: 'repair-equipment', slot: 'weapon' });

  assert.equal(text.includes('repaired'), true);
  assert.equal(champ.weapon.durability, EQUIP_MAX_DURABILITY);
  assert.equal(champ.gold, 100 - 40);
  assert.equal(champ.knot, 5 - 2);
});

test('applyForgeRepair: refuses an undamaged or unaffordable item', () => {
  const champ = makeChampion({ id: 'cA', gold: 100, knot: 5 });
  champ.weapon = { ...weapon(), durability: EQUIP_MAX_DURABILITY, maxDurability: EQUIP_MAX_DURABILITY };
  const state = makeState({ champions: [champ] });

  assert.equal(applyForgeRepair(state, champ, { kind: 'repair-equipment', slot: 'weapon' }), '');
  champ.weapon = { ...weapon(), durability: 1, maxDurability: EQUIP_MAX_DURABILITY };
  champ.gold = 0;
  assert.equal(applyForgeRepair(state, champ, { kind: 'repair-equipment', slot: 'weapon' }), '');
  assert.equal(champ.weapon.durability, 1, 'nothing changed');
});
