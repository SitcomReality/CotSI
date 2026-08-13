/**
 * tradeRenderer.js — DOM rendering for the trade screen.
 *
 * Rebuilds the four Confrontation zones (shopper plate | stage | seller plate |
 * footer) from the trade view-model. Reads the VM only; all mutations happen in
 * runtime/trade/trade.js via the action bus.
 */
import { h } from '../domBuilder.js';
import { svgIcon } from '../svgIcon.js';

/**
 * @param {object} vm — getTradeVM() result
 */
export function renderTrade(vm) {
  document.getElementById('tradeSubtitle').textContent = vm.seller.subtitle;
  document.getElementById('tradeShopper').replaceChildren(shopperPlate(vm.champion));
  document.getElementById('tradeSeller').replaceChildren(sellerPlate(vm.seller));
  document.getElementById('tradeStage').replaceChildren(stageContent(vm));
  document.getElementById('tradeFooter').replaceChildren(footerContent(vm));
}

// ─── Portrait (shared with the combat participant plate) ──────────────────

function portraitNode(url, name, glyphId) {
  if (url) return h('img', { class: 'combatant-portrait', src: url, alt: name });
  return h('div', { class: 'combatant-portrait combatant-portrait--fallback' },
    svgIcon(glyphId || 'g-crucible', 40));
}

// ─── Shopper plate ─────────────────────────────────────────────────────────

function shopperPlate(champ) {
  return h('div', {
      class: 'trade-plate',
      style: {
        '--faction-color': champ.factionColor,
        '--faction-base': champ.factionBase,
        '--faction-ui': champ.factionUi,
        '--faction-ui-glow': champ.factionUiGlow,
      },
    },
    h('div', { class: 'combatant-portrait-frame' }, portraitNode(champ.portrait, champ.name, champ.glyphId)),
    h('div', { class: 'trade-plate-body' },
      h('h3', { class: 'trade-plate-name' }, champ.name),
      h('div', { class: 'trade-resources' },
        h('span', { class: 'trade-resource trade-resource--gold' }, `${champ.gold} gold`),
        h('span', { class: 'trade-resource trade-resource--knot' }, `${champ.knot} knot${champ.knot === 1 ? '' : 's'}`),
      ),
      h('div', { class: 'trade-gear' },
        gearRow('Weapon', champ.weapon, champ.weaponIcon),
        gearRow('Armor', champ.armor, champ.armorIcon),
      ),
    ),
  );
}

function gearRow(slot, itemName, iconUrl) {
  return h('div', { class: 'trade-gear-row' },
    h('span', { class: 'trade-gear-slot' }, slot),
    itemIcon(iconUrl),
    h('span', { class: 'trade-gear-name' + (itemName ? '' : ' is-empty') }, itemName || '—'),
  );
}

/** A small painted-miniature icon for an item, or null when there's none. */
function itemIcon(url) {
  if (!url) return null;
  return h('img', { class: 'trade-item-icon', src: url, alt: '' });
}

// ─── Seller plate ─────────────────────────────────────────────────────────

function sellerPlate(seller) {
  return h('div', {
      class: 'trade-plate trade-plate--seller',
      style: { '--faction-base': seller.factionBase ?? '#3a3a44' },
    },
    h('div', { class: 'combatant-portrait-frame' }, portraitNode(seller.portrait, seller.name, seller.glyphId)),
    h('div', { class: 'trade-plate-body' },
      h('h3', { class: 'trade-plate-name' }, seller.name),
      h('div', { class: 'trade-offer-grid' },
        ...seller.offers.map((offer) => offerTile(offer)),
      ),
      seller.heal ? healButton(seller.heal) : null,
    ),
  );
}

function offerTile(offer) {
  const classes = ['trade-offer'];
  if (offer.selected) classes.push('is-selected');
  if (!offer.canAfford) classes.push('is-unaffordable');

  return h('div', {
    class: classes.join(' '),
    dataAction: 'tradeSelect',
    dataIndex: offer.index,
  },
    itemIcon(offer.icon),
    h('div', { class: 'trade-offer__label' }, offer.label),
    offer.sublabel ? h('div', { class: 'trade-offer__sub' }, offer.sublabel) : null,
  );
}

function healButton(heal) {
  const classes = ['trade-heal'];
  if (!heal.canAfford) classes.push('is-unaffordable');
  if (heal.atFull) classes.push('is-unaffordable');
  return h('div', { class: classes.join(' '), dataAction: 'tradeHeal' },
    h('span', { class: 'trade-heal__label' }, heal.name),
    h('span', { class: 'trade-heal__cost' }, `${heal.cost.gold}g`),
  );
}

// ─── Stage ────────────────────────────────────────────────────────────────

function stageContent(vm) {
  const sel = vm.selected;
  return h('div', { class: 'trade-stage-body' },
    h('div', { class: 'trade-stage-mark' }, sel ? 'Buy' : 'Select'),
    sel
      ? h('div', { class: 'trade-selection' },
          h('div', { class: 'trade-selection__label' }, sel.label),
          sel.sublabel ? h('div', { class: 'trade-selection__sub' }, sel.sublabel) : null,
          costRow(sel.cost),
        )
      : h('div', { class: 'trade-hint' }, 'Choose an offering to see its price.'),
  );
}

function costRow(cost) {
  const parts = [];
  if (cost.gold) parts.push(h('span', { class: 'trade-cost trade-cost--gold' }, `${cost.gold} gold`));
  if (cost.knot) parts.push(h('span', { class: 'trade-cost trade-cost--knot' }, `${cost.knot} knot${cost.knot === 1 ? '' : 's'}`));
  return h('div', { class: 'trade-cost-row' }, ...parts);
}

// ─── Footer ───────────────────────────────────────────────────────────────

function footerContent(vm) {
  const sel = vm.selected;
  const buy = sel
    ? h('button', { class: 'btn' + (sel.canAfford ? '' : ' is-unaffordable'), dataAction: 'tradeBuy' }, 'Buy')
    : null;
  return h('div', { class: 'trade-actions' },
    buy,
    h('button', { class: 'btn', dataAction: 'tradeClose' }, 'Close'),
  );
}
