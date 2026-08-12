/**
 * baseInteraction.js — Pure game logic for base hex interaction.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G } from './liveGame.js';
import { addLogEntry } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { FACTIONS } from '../rules/factionData.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment, factionAccentVar } from '../rules/logHelpers.js';
import { SANCTUARY_HEAL_FRACTION, POTENCY_COST_DISCOUNTED, POTENCY_COST_STANDARD } from '../../params/game/economyParams.js';
import { FACTION_DISCOUNT } from '../../params/game/factionParams.js';

/**
 * Handle interacting with a base (sanctuary or potency purchase).
 * @param {object} ch
 * @param {object} tile
 * @returns {{ ok: boolean, reason?: string }} `{ ok: false, reason }` when the
 *   interaction is rejected; `{ ok: true }` on success.
 */
export function interactBase(ch, tile) {
  const factionMap = buildChampionFactionMap(G.champions);

  if (tile.feature.faction === ch.faction) {
    // Sanctuary — heal 50% max HP
    const healed = Math.ceil(ch.maxHp * SANCTUARY_HEAL_FRACTION);
    ch.hp = Math.min(ch.maxHp, ch.hp + healed);
    ch.actionPoints = 0;
    addLogEntry(G, {
      category: LOG_CATEGORY.HEAL,
      subject: championSegment(ch.name, factionMap),
      verb: 'receives sanctuary',
      object: null,
      detail: { text: `+${healed} HP`, color: 'var(--verdigris)' },
    });
    recordLedgerEntry(ch, `+${healed} HP — sanctuary`, 'gain', 'hp');
    return { ok: true };
  } else {
    // Buy faction potency
    const cost = ch.faction === FACTION_DISCOUNT ? POTENCY_COST_DISCOUNTED : POTENCY_COST_STANDARD;
    if (ch.gold >= cost) {
      ch.gold -= cost;
      ch.potencies[tile.feature.faction]++;
      ch.actionPoints = 0;
      addLogEntry(G, {
        category: LOG_CATEGORY.ECONOMY,
        subject: championSegment(ch.name, factionMap),
        verb: 'buys',
        object: { text: FACTIONS[tile.feature.faction].name, color: factionAccentVar(tile.feature.faction) },
        detail: { text: 'potency' },
      });
      recordLedgerEntry(
        ch,
        `-${cost} gold, +1 ${FACTIONS[tile.feature.faction].name} potency — base purchase`,
        'neutral',
        'gold'
      );
      return { ok: true };
    }
    return { ok: false, reason: 'Not enough gold.' };
  }
}
