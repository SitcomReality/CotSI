/**
 * traderStock.js — Trader inventory generation.
 * Pure, game-specific: takes a random function and returns a stock list.
 */
export function traderStock(rand) {
  return [
    { type: 'heal', name: 'Moonberry', cost: 14, heal: 10 },
    { type: 'potency', faction: Math.floor(rand() * 7), cost: 22 },
    {
      type: 'equip',
      slot: 'weapon',
      name: ['Thorn Brand', 'Chrono Quill', 'Masque Knife'][Math.floor(rand() * 3)],
      cost: 34,
      bonus: { secondary: 1 },
    },
  ];
}
