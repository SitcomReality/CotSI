/**
 * traderStock.js — Trader inventory generation.
 * Pure, game-specific: takes a random function and returns a stock list.
 */
import { TRADER_HEAL_COST, TRADER_HEAL_AMOUNT, TRADER_POTENCY_COST, TRADER_WEAPON_COST, TRADER_WEAPON_BONUS } from '../../params/game/economyParams.js';

export function traderStock(rand) {
  return [
    { type: 'heal', name: 'Moonberry', cost: TRADER_HEAL_COST, heal: TRADER_HEAL_AMOUNT },
    { type: 'potency', faction: Math.floor(rand() * 7), cost: TRADER_POTENCY_COST },
    {
      type: 'equip',
      slot: 'weapon',
      name: ['Thorn Brand', 'Chrono Quill', 'Masque Knife'][Math.floor(rand() * 3)],
      cost: TRADER_WEAPON_COST,
      bonus: { secondary: TRADER_WEAPON_BONUS },
    },
  ];
}
