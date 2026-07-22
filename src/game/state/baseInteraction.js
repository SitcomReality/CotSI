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
import { toast } from '../../ui/hud.js';

/**
 * Handle interacting with a base (sanctuary or potency purchase).
 * @param {object} ch
 * @param {object} tile
 */
export function interactBase(ch, tile) {
  const factionMap = buildChampionFactionMap(G.champions);

  if (tile.feature.faction === ch.faction) {
    // Sanctuary — heal 50% max HP
    const healed = Math.ceil(ch.maxHp * 0.5);
    ch.hp = Math.min(ch.maxHp, ch.hp + healed);
    ch.moves = 0;
    addLogEntry(G, {
      category: LOG_CATEGORY.HEAL,
      subject: championSegment(ch.name, factionMap),
      verb: 'receives sanctuary',
      object: null,
      detail: { text: `+${healed} HP`, color: 'var(--verdigris)' },
    });
    recordLedgerEntry(ch, `+${healed} HP — sanctuary`, 'gain', 'hp');
  } else {
    // Buy faction potency
    const cost = ch.faction === 4 ? 14 : 18;
    if (ch.gold >= cost) {
      ch.gold -= cost;
      ch.potencies[tile.feature.faction]++;
      ch.moves = 0;
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
    } else {
      toast('Not enough gold.');
    }
  }
}
