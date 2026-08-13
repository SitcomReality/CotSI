/**
 * equipment.js — Placeholder equipment catalog and slot constants.
 *
 * Pure data. Real equipment design (bonuses, rarities, scaling) lands in a
 * later update; these items exist so trader inventories have something to
 * stock and the two-slot equip model (weapon / armor) is exercised end to end.
 *
 * Model: a champion has exactly two slots — `weapon` (weapon/tool/held) and
 * `armor` (armor/clothes) — each holding either an item object or null.
 * Equipment is non-stacking: replacing an item destroys the old one and
 * refunds a fraction of its gold cost (see trading.equipItem).
 */
export const EQUIPMENT_SLOTS = Object.freeze(['weapon', 'armor']);

/**
 * Placeholder catalog. `cost.knot > 0` marks "powerful" equipment — the trader
 * inventory guarantees at least one of these per reset. `bonus` is a
 * display-only hint for now (not yet wired into combat scoring).
 */
export const EQUIPMENT_CATALOG = Object.freeze([
  { id: 'eq-thorn-brand',   name: 'Thorn Brand',      slot: 'weapon', cost: { gold: 34, knot: 0 }, bonus: { attack: 1 } },
  { id: 'eq-chrono-quill',  name: 'Chrono Quill',     slot: 'weapon', cost: { gold: 38, knot: 0 }, bonus: { attack: 2 } },
  { id: 'eq-masque-knife',  name: 'Masque Knife',     slot: 'weapon', cost: { gold: 30, knot: 0 }, bonus: { attack: 1 } },
  { id: 'eq-hearth-robe',   name: 'Hearth Robe',      slot: 'armor',  cost: { gold: 28, knot: 0 }, bonus: { defense: 1 } },
  { id: 'eq-verdant-cloak', name: 'Verdant Cloak',    slot: 'armor',  cost: { gold: 32, knot: 0 }, bonus: { defense: 2 } },
  { id: 'eq-orichalcum-blade', name: 'Orichalcum Blade', slot: 'weapon', cost: { gold: 40, knot: 2 }, bonus: { attack: 3 } },
  { id: 'eq-augur-mantle',  name: "Augur's Mantle",   slot: 'armor',  cost: { gold: 36, knot: 2 }, bonus: { defense: 3 } },
]);

/** Equipment requiring God's Knots as well as gold (the "powerful" tier). */
export const POWERFUL_EQUIPMENT = Object.freeze(EQUIPMENT_CATALOG.filter(i => i.cost.knot > 0));
/** Gold-only equipment. */
export const NORMAL_EQUIPMENT = Object.freeze(EQUIPMENT_CATALOG.filter(i => i.cost.knot === 0));

/** Pick a random item from a catalog list (defaults to the full catalog). */
export function pickEquipment(rand, list = EQUIPMENT_CATALOG) {
  return list[Math.floor(rand() * list.length)];
}
