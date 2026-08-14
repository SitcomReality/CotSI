/**
 * trade.js — Runtime orchestration for the trade screen.
 *
 * Holds the active trade session (seller + selected offer), resolves the 3D
 * portraits from the render layer, builds the view-model, and wires the action
 * bus (`tradeSelect` / `tradeBuy` / `tradeHeal` / `tradeClose`) to the pure
 * purchase mutations in game/state. ui/ never imports render/ or mutates state.
 */
import { currentChamp } from '../../game/state/liveGame.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { traderHealService } from '../../game/rules/traderStock.js';
import { buyFromStock, buyHealing } from '../../game/state/features/trading.js';
import { portraitForCombatant, traderPortrait, basePortrait, itemPortrait } from '../portraitResolver.js';
import { getTradeVM } from '../../ui/viewModels/tradeViewModel.js';
import { renderTrade } from '../../ui/trade/tradeRenderer.js';
import { showModal, hideModal } from '../../ui/modals/modalShell.js';
import { registerAction } from '../../shared/actionBus.js';
import { toast } from '../../ui/hud.js';
import { refreshAll } from '../refreshAll.js';
import { FACTION_DISCOUNT } from '../../params/game/factionParams.js';
import { POTENCY_COST_DISCOUNTED, POTENCY_COST_STANDARD } from '../../params/game/economyParams.js';

/** The active trade session: { seller, selectedIndex }. */
let session = null;

/** Base potency price — HRT (FACTION_DISCOUNT) buys at the discounted rate. */
function basePotencyCost(champ) {
  return champ.faction === FACTION_DISCOUNT ? POTENCY_COST_DISCOUNTED : POTENCY_COST_STANDARD;
}

function render() {
  if (!session) return;
  const champ = currentChamp();
  if (!champ) return;
  const vm = getTradeVM(champ, session.seller, session.selectedIndex, portraitForCombatant(champ), itemIcons(champ));
  renderTrade(vm);
}

/** Icons for every equipment item in the seller's offers and the shopper's gear. */
function itemIcons(champ) {
  const icons = new Map();
  const items = [...(session?.seller?.offers ?? [])];
  items.push(champ?.weapon, champ?.armor);
  for (const offerOrItem of items) {
    const item = offerOrItem?.kind === 'equipment' ? offerOrItem.item : offerOrItem;
    const id = item?.descriptor ?? item?.id;
    if (id && !icons.has(id)) icons.set(id, itemPortrait(id));
  }
  return icons;
}

/** Open the trade screen with a wandering trader as the seller. */
export function openTradeWithTrader(trader) {
  session = {
    seller: {
      name: trader.name || 'Trader',
      subtitle: 'Wandering Trader',
      portrait: traderPortrait(),
      glyphId: null,
      factionBase: null,
      offers: trader.stock, // live reference — purchases drain the shared stock
      heal: traderHealService(),
    },
    selectedIndex: -1,
  };
  showModal('tradeModal');
  render();
}

/** Open the trade screen with a faction base as the seller (single potency offer). */
export function openTradeWithBase(faction) {
  const fac = FACTIONS[faction];
  if (!fac) return;
  const champ = currentChamp();
  session = {
    seller: {
      name: `${fac.name} Base`,
      subtitle: 'Faction Base',
      portrait: basePortrait(faction),
      glyphId: fac.glyphId,
      factionBase: fac.base,
      offers: [{ kind: 'potency', faction, qty: Infinity, cost: { gold: basePotencyCost(champ) } }],
      heal: null,
    },
    selectedIndex: 0, // a base has one offering — preselect it so the price shows
  };
  showModal('tradeModal');
  render();
}

function closeTrade() {
  hideModal('tradeModal');
  session = null;
}

/** Register the trade actions (called once from bootstrap via initTrade). */
export function initTrade() {
  registerAction('tradeSelect', (el) => {
    if (!session) return;
    const idx = Number(el.dataset.index);
    session.selectedIndex = Number.isFinite(idx) ? idx : -1;
    render();
  });

  registerAction('tradeBuy', () => {
    if (!session) return;
    const champ = currentChamp();
    if (!champ) return;
    const res = buyFromStock(champ, session.seller.offers, session.selectedIndex);
    if (!res.ok) { toast(res.reason, true); return; }
    if (res.consumed) session.selectedIndex = -1; // slot drained and removed
    render();
    refreshAll();
  });

  registerAction('tradeHeal', () => {
    if (!session) return;
    const champ = currentChamp();
    if (!champ || !session.seller.heal) return;
    const res = buyHealing(champ, session.seller.heal);
    if (!res.ok) { toast(res.reason, true); return; }
    render();
    refreshAll();
  });

  registerAction('tradeClose', () => closeTrade());
}
