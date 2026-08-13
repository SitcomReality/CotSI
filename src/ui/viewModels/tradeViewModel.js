import { FACTIONS } from '../../game/rules/factionData.js';

/**
 * Pure view-model for the trade screen (Confrontation convention: shopper |
 * stage | seller). Takes the champion + a seller (trader or faction base) and
 * produces display-ready data. No DOM, no side effects.
 *
 * @param {object} champ          — the shopping champion
 * @param {object} seller         — normalized seller (see runtime/trade/trade.js)
 * @param {number} selectedIndex  — selected offer index, or -1
 * @param {string|null} shopperPortrait — champion's portrait data URL
 * @param {Map<string,string>|null} [itemIcons] — item id → icon data URL (equipment offers)
 * @returns {object} trade VM
 */
export function getTradeVM(champ, seller, selectedIndex, shopperPortrait, itemIcons = null) {
  const fac = FACTIONS[champ.faction];

  const offers = seller.offers.map((offer, index) => {
    const built = buildOffer(offer, index, itemIcons);
    built.selected = index === selectedIndex;
    built.canAfford = canAfford(champ, built.cost);
    return built;
  });

  const selected = selectedIndex >= 0 ? offers[selectedIndex] ?? null : null;

  return {
    champion: {
      name: champ.name,
      factionColor: fac.color,
      factionBase: fac.base,
      factionUi: fac.uiColor,
      factionUiGlow: fac.uiGlow,
      glyphId: fac.glyphId,
      portrait: shopperPortrait,
      gold: champ.gold,
      knot: champ.knot,
      weapon: champ.weapon?.name ?? null,
      armor: champ.armor?.name ?? null,
      weaponIcon: itemIcons?.get(champ.weapon?.descriptor ?? champ.weapon?.id) ?? null,
      armorIcon: itemIcons?.get(champ.armor?.descriptor ?? champ.armor?.id) ?? null,
    },
    seller: {
      name: seller.name,
      subtitle: seller.subtitle,
      portrait: seller.portrait ?? null,
      glyphId: seller.glyphId ?? null,
      factionBase: seller.factionBase ?? null,
      offers,
      heal: seller.heal
        ? { name: seller.heal.name, cost: { ...seller.heal.cost }, canAfford: champ.gold >= (seller.heal.cost?.gold || 0), atFull: champ.hp >= champ.maxHp }
        : null,
    },
    selected,
  };
}

function buildOffer(offer, index, itemIcons) {
  if (offer.kind === 'equipment') {
    const itemId = offer.item?.descriptor ?? offer.item?.id;
    return {
      index,
      kind: 'equipment',
      label: offer.item.name,
      sublabel: offer.item.slot === 'weapon' ? 'Weapon' : 'Armor',
      icon: itemIcons?.get(itemId) ?? null,
      cost: { ...offer.cost },
    };
  }
  if (offer.kind === 'potency') {
    const fac = FACTIONS[offer.faction];
    return {
      index,
      kind: 'potency',
      label: `${fac.name} Potency`,
      sublabel: Number.isFinite(offer.qty) && offer.qty > 1 ? `×${offer.qty}` : '',
      cost: { ...offer.cost },
    };
  }
  // relic
  return {
    index,
    kind: 'relic',
    label: 'Relic',
    sublabel: Number.isFinite(offer.qty) && offer.qty > 1 ? `×${offer.qty}` : '',
    cost: { ...offer.cost },
  };
}

function canAfford(champ, cost) {
  if (champ.gold < (cost.gold || 0)) return false;
  if (cost.knot && champ.knot < cost.knot) return false;
  return true;
}
