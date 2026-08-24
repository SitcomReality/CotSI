/**
 * trading.test.js — Trader inventory generation and purchase mutations
 * (src/game/rules/traderStock.js + equipment.js, src/game/state/features/trading.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traderStock, traderHealService } from '../../../src/game/rules/traderStock.js';
import { EQUIPMENT_CATALOG, POWERFUL_EQUIPMENT } from '../../../src/game/rules/equipment.js';
import { equipItem, buyFromStock, buyHealing } from '../../../src/game/state/features/trading.js';
import { TRADER_STOCK_SIZE, EQUIP_REFUND_FRACTION } from '../../../src/params/game/economyParams.js';

/** Deterministic RNG (mulberry32) so tests are reproducible. */
function seededRand(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function champion(overrides = {}) {
  return {
    faction: 0,
    gold: 100,
    knot: 10,
    relics: 0,
    potencies: [0, 0, 0, 0, 0, 0, 0],
    weapon: null,
    armor: null,
    hp: 50,
    maxHp: 100,
    ...overrides,
  };
}

test('traderStock: exactly 7 slots, all with a kind and a gold cost', () => {
  const stock = traderStock(seededRand(42));
  assert.equal(stock.length, TRADER_STOCK_SIZE);
  for (const slot of stock) {
    assert.ok(['equipment', 'potency', 'relic'].includes(slot.kind), `unexpected kind ${slot.kind}`);
    assert.ok(Number.isFinite(slot.cost?.gold), 'slot missing numeric gold cost');
  }
});

test('traderStock: guarantees at least one powerful (knot-cost) equipment item', () => {
  for (let seed = 0; seed < 20; seed++) {
    const stock = traderStock(seededRand(seed));
    const powerful = stock.filter(s => s.kind === 'equipment' && s.cost.knot > 0);
    assert.ok(powerful.length >= 1, `seed ${seed} missing powerful equipment`);
  }
});

test('traderStock: usually offers one or two potency stacks', () => {
  for (let seed = 0; seed < 20; seed++) {
    const stock = traderStock(seededRand(seed));
    const pots = stock.filter(s => s.kind === 'potency');
    assert.ok(pots.length >= 1 && pots.length <= 2, `seed ${seed} potency slots = ${pots.length}`);
  }
});

test('traderStock: equipment slots embed a catalog item with a valid slot', () => {
  const stock = traderStock(seededRand(7));
  for (const slot of stock.filter(s => s.kind === 'equipment')) {
    assert.ok(slot.item?.slot === 'weapon' || slot.item?.slot === 'armor');
    assert.ok(slot.item?.name);
  }
});

test('equipment catalog: powerful items require knots, normal items do not', () => {
  assert.ok(POWERFUL_EQUIPMENT.length > 0);
  for (const item of EQUIPMENT_CATALOG) {
    assert.ok(item.slot === 'weapon' || item.slot === 'armor');
    assert.ok(Number.isFinite(item.cost.gold));
  }
});

test('equipItem: fills an empty slot with no refund, as a fresh full-durability instance', () => {
  const champ = champion();
  const item = EQUIPMENT_CATALOG[0];
  const refund = equipItem(champ, item);
  assert.equal(refund, 0);
  assert.notEqual(champ.weapon, item, 'equipped item is an instance clone');
  assert.equal(champ.weapon.id, item.id);
  assert.equal(champ.weapon.durability, champ.weapon.maxDurability);
});

test('equipItem: replacement destroys the old item and refunds its durability-scaled sell value', () => {
  const old = { id: 'x', name: 'Old', slot: 'weapon', cost: { gold: 40, knot: 0 }, durability: 5, maxDurability: 10 };
  const champ = champion({ weapon: old });
  const item = EQUIPMENT_CATALOG.find(i => i.slot === 'weapon');
  const refund = equipItem(champ, item);
  assert.equal(refund, Math.floor(40 * EQUIP_REFUND_FRACTION * 0.5), 'half-worn item sells for half of half');
  assert.equal(champ.gold, 100 + refund);
  assert.equal(champ.weapon.id, item.id);
});

test('buyFromStock: potency purchase spends gold, adds a pip, decrements the stack', () => {
  const champ = champion();
  const stock = [{ kind: 'potency', faction: 3, qty: 2, cost: { gold: 22 } }];
  const res = buyFromStock(champ, stock, 0);
  assert.deepEqual(res, { ok: true, consumed: false, kind: 'potency' });
  assert.equal(champ.gold, 78);
  assert.equal(champ.potencies[3], 1);
  assert.equal(stock[0].qty, 1);
});

test('buyFromStock: removes a slot when its quantity reaches zero', () => {
  const champ = champion();
  const stock = [{ kind: 'relic', qty: 1, cost: { gold: 30 } }];
  const res = buyFromStock(champ, stock, 0);
  assert.equal(res.ok, true);
  assert.equal(res.consumed, true);
  assert.equal(champ.relics, 1);
  assert.equal(stock.length, 0);
});

test('buyFromStock: equipment purchase deducts gold + knots and equips the item', () => {
  const champ = champion();
  const item = POWERFUL_EQUIPMENT[0];
  const stock = [{ kind: 'equipment', item, cost: { ...item.cost } }];
  const res = buyFromStock(champ, stock, 0);
  assert.equal(res.ok, true);
  assert.equal(champ.gold, 100 - item.cost.gold);
  assert.equal(champ.knot, 10 - item.cost.knot);
  assert.equal(champ[item.slot].id, item.id);
  assert.equal(champ[item.slot].durability, champ[item.slot].maxDurability, 'fresh instance at full durability');
});

test('buyFromStock: rejects when gold or knots are insufficient', () => {
  const poor = champion({ gold: 5 });
  const stock = [{ kind: 'potency', faction: 1, qty: 1, cost: { gold: 22 } }];
  assert.equal(buyFromStock(poor, stock, 0).ok, false);

  const knotless = champion({ knot: 0 });
  const item = POWERFUL_EQUIPMENT[0];
  const eq = [{ kind: 'equipment', item, cost: { ...item.cost } }];
  assert.equal(buyFromStock(knotless, eq, 0).ok, false);
});

test('buyHealing: heals up to max HP and spends gold; rejects at full health', () => {
  const champ = champion({ hp: 50 });
  const res = buyHealing(champ, traderHealService());
  assert.equal(res.ok, true);
  assert.equal(champ.hp, 60);
  assert.equal(champ.gold, 100 - traderHealService().cost.gold);

  const full = champion({ hp: 100, gold: 100 });
  assert.equal(buyHealing(full, traderHealService()).ok, false);
});
