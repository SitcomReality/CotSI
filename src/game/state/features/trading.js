/**
 * trading.js — Trader/base purchase mutations.
 *
 * Applies a purchase against shared trader stock (or a faction base's virtual
 * potency slot), mutating champion resources and the stock array. Pure state
 * mutations — no DOM, no UI. All currency is per-champion (gold + God's Knots).
 */
import { sellValue, maxDurabilityOf } from '../../rules/equipment.js';

/**
 * Equip `item` into its slot. The item is cloned as a fresh instance with
 * full durability; whatever was there is 'sold' automatically — destroyed,
 * with its durability-scaled sell value (sellValue) refunded in gold.
 * Returns the refunded gold.
 */
export function equipItem(champ, item) {
  const slot = item.slot;
  const old = champ[slot];
  let refund = 0;
  if (old) {
    refund = sellValue(old);
    champ.gold += refund;
  }
  champ[slot] = { ...item, durability: maxDurabilityOf(item), maxDurability: maxDurabilityOf(item) };
  return refund;
}

/**
 * Buy one unit from a stock slot. `stock` is the shared trader stock array (or
 * a base's transient potency slot); `index` selects the slot. On success the
 * slot's qty decrements, and a slot that reaches zero is removed from the
 * array (so every player sees the same shared inventory drain).
 *
 * @returns {{ ok: boolean, reason?: string, consumed?: boolean, kind?: string }}
 */
export function buyFromStock(champ, stock, index) {
  const entry = stock?.[index];
  if (!entry) return { ok: false, reason: 'Nothing to buy.' };

  const cost = entry.cost || { gold: 0, knot: 0 };
  if (champ.gold < cost.gold) return { ok: false, reason: 'Not enough gold.' };
  if (cost.knot && champ.knot < cost.knot) return { ok: false, reason: "Not enough God's Knots." };

  champ.gold -= cost.gold;
  if (cost.knot) champ.knot -= cost.knot;

  if (entry.kind === 'equipment') {
    equipItem(champ, entry.item);
  } else if (entry.kind === 'potency') {
    champ.potencies[entry.faction] = (champ.potencies[entry.faction] || 0) + 1;
  } else if (entry.kind === 'relic') {
    champ.relics += 1;
  }

  entry.qty -= 1;
  const consumed = entry.qty <= 0;
  if (consumed) stock.splice(index, 1);

  return { ok: true, consumed, kind: entry.kind };
}

/**
 * Buy the trader's healing service (infinite — no stock consumed).
 * @param {object} champ
 * @param {{ cost?: {gold:number}, heal?: number }} service
 */
export function buyHealing(champ, service = {}) {
  if (champ.hp >= champ.maxHp) return { ok: false, reason: 'Already at full health.' };
  const gold = service.cost?.gold || 0;
  if (champ.gold < gold) return { ok: false, reason: 'Not enough gold.' };
  champ.gold -= gold;
  champ.hp = Math.min(champ.maxHp, champ.hp + (service.heal || 0));
  return { ok: true };
}
