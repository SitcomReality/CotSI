/**
 * traderStock.js — Trader inventory generation.
 *
 * Pure, game-specific: takes a random function and returns a 7-slot stock list
 * (one slot per potency pip in the combat interface). Healing is a separate
 * always-available service (traderHealService), not one of the seven slots.
 *
 * A stock slot is a stack of same-kind goods:
 *   { kind:'equipment', item, cost:{gold,knot} }   — qty implied 1 (non-stacking)
 *   { kind:'potency',   faction, qty, cost:{gold} }
 *   { kind:'relic',     qty, cost:{gold} }
 */
import {
  TRADER_STOCK_SIZE,
  TRADER_POTENCY_COST,
  TRADER_POTENCY_STACK_MAX,
  TRADER_RELIC_COST,
  TRADER_RELIC_STACK_MAX,
  TRADER_HEAL_COST,
  TRADER_HEAL_AMOUNT,
} from '../../params/game/economyParams.js';
import { POWERFUL_EQUIPMENT, NORMAL_EQUIPMENT, pickEquipment } from './equipment.js';

function equipmentOffer(rand, list) {
  const item = pickEquipment(rand, list);
  return { kind: 'equipment', item, cost: { ...item.cost } };
}

function potencyOffer(rand) {
  return {
    kind: 'potency',
    faction: Math.floor(rand() * 7),
    qty: 1 + Math.floor(rand() * TRADER_POTENCY_STACK_MAX),
    cost: { gold: TRADER_POTENCY_COST },
  };
}

function relicOffer(rand) {
  return {
    kind: 'relic',
    qty: 1 + Math.floor(rand() * TRADER_RELIC_STACK_MAX),
    cost: { gold: TRADER_RELIC_COST },
  };
}

/**
 * Generate a fresh 7-slot inventory.
 * Guarantees one powerful (knot-cost) equipment item, usually one or two
 * potency stacks, and fills the rest with relics and gold-only gear.
 */
export function traderStock(rand) {
  const stock = [];

  stock.push(equipmentOffer(rand, POWERFUL_EQUIPMENT));

  const potencySlots = rand() < 0.5 ? 1 : 2;
  for (let i = 0; i < potencySlots; i++) stock.push(potencyOffer(rand));

  while (stock.length < TRADER_STOCK_SIZE) {
    stock.push(rand() < 0.5 ? relicOffer(rand) : equipmentOffer(rand, NORMAL_EQUIPMENT));
  }

  return stock;
}

/** The infinite healing service every trader offers (separate from the 7 slots). */
export function traderHealService() {
  return { kind: 'heal', name: 'Moonberry', cost: { gold: TRADER_HEAL_COST }, heal: TRADER_HEAL_AMOUNT };
}
