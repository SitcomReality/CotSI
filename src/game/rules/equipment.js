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
 * refunds its durability-scaled sell value in gold (see trading.equipItem /
 * sellValue). Items wear down EQUIP_DURABILITY_TICK per turn (beginTurn) and
 * stop functioning at 0 durability until repaired at a Forge.
 */
export const EQUIPMENT_SLOTS = Object.freeze(['weapon', 'armor']);
/**
 * Placeholder catalog. `cost.knot > 0` marks "powerful" equipment — the trader
 * inventory guarantees at least one of these per reset. `bonus.attack` /
 * `bonus.defense` are added to the champion's final combat scores in
 * applyFinalBonuses (combatScoring.js).
 */
export const EQUIPMENT_CATALOG = Object.freeze([
  { id: 'eq-thorn-brand',   name: 'Thorn Brand',      slot: 'weapon', descriptor: 'thornBrand',      cost: { gold: 34, knot: 0 }, bonus: { attack: 1 } },
  { id: 'eq-chrono-quill',  name: 'Chrono Quill',     slot: 'weapon', descriptor: 'chronoQuill',     cost: { gold: 38, knot: 0 }, bonus: { attack: 2 } },
  { id: 'eq-masque-knife',  name: 'Masque Knife',     slot: 'weapon', descriptor: 'masqueKnife',     cost: { gold: 30, knot: 0 }, bonus: { attack: 1 } },
  { id: 'eq-hearth-robe',   name: 'Hearth Robe',      slot: 'armor',  descriptor: 'hearthRobe',      cost: { gold: 28, knot: 0 }, bonus: { defense: 1 } },
  { id: 'eq-verdant-cloak', name: 'Verdant Cloak',    slot: 'armor',  descriptor: 'verdantCloak',    cost: { gold: 32, knot: 0 }, bonus: { defense: 2 } },
  { id: 'eq-orichalcum-blade', name: 'Orichalcum Blade', slot: 'weapon', descriptor: 'orichalcumBlade', cost: { gold: 40, knot: 2 }, bonus: { attack: 3 } },
  { id: 'eq-augur-mantle',  name: "Augur's Mantle",   slot: 'armor',  descriptor: 'augurMantle',     cost: { gold: 36, knot: 2 }, bonus: { defense: 3 } },
]);

/** Equipment requiring God's Knots as well as gold (the "powerful" tier). */
export const POWERFUL_EQUIPMENT = Object.freeze(EQUIPMENT_CATALOG.filter(i => i.cost.knot > 0));
/** Gold-only equipment. */
export const NORMAL_EQUIPMENT = Object.freeze(EQUIPMENT_CATALOG.filter(i => i.cost.knot === 0));

import { EQUIP_REFUND_FRACTION, EQUIP_MAX_DURABILITY } from '../../params/game/economyParams.js';

/** The item's max durability (instances carry `maxDurability`; defaults apply to bare catalog refs). */
export function maxDurabilityOf(item) {
  return item?.maxDurability ?? EQUIP_MAX_DURABILITY;
}

/** Whether an item still functions: present, and not worn down to 0 durability. */
export function isFunctional(item) {
  return !!item && (item.durability == null || item.durability > 0);
}

/**
 * What an item 'sells' for when replaced (the refund): its gold cost scaled by
 * remaining durability, rounded down, never below 1 gold. Full durability →
 * half the buy cost; 0 durability → 1 gold. Knot costs are not refunded.
 */
export function sellValue(item) {
  const gold = item?.cost?.gold || 0;
  if (!gold) return 1;
  const ratio = item.durability == null ? 1 : Math.max(0, item.durability) / maxDurabilityOf(item);
  return Math.max(1, Math.floor(gold * EQUIP_REFUND_FRACTION * ratio));
}

/** Pick a random item from a catalog list (defaults to the full catalog). */
export function pickEquipment(rand, list = EQUIPMENT_CATALOG) {
  return list[Math.floor(rand() * list.length)];
}
