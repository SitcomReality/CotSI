/**
 * arrivalInteractions.js — Resource harvesting on champion arrival.
 * Handles fruit eating, knot mining, etc.
 */
import { coordKey } from '../../engine/rules/hexGrid.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';

export function interactOnArrival(state, champ) {
  const factionMap = buildChampionFactionMap(state.champions);
  const tile = state.tiles[coordKey(champ.pos)];
  if (tile.feature?.kind === 'tree' && tile.feature.ripe !== false) {
    if (!tile.feature.nextFruitDay || state.day >= tile.feature.nextFruitDay) {
      const heal = champ.faction === 2 ? 34 : 18;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      tile.feature.nextFruitDay = state.day + 4;
      tile.feature.ripe = false;
      addLogEntry(state, {
        category: LOG_CATEGORY.HEAL,
        subject: championSegment(champ.name, factionMap),
        verb: 'eats manuscript fruit',
        object: null,
        detail: { text: `+${heal} HP`, color: 'var(--verdigris)' },
      });
      recordLedgerEntry(champ, `+${heal} HP — manuscript fruit`, 'gain', 'hp');
    }
  }
  if (tile.feature?.kind === 'knot' && !tile.feature.mined) {
    const amt = tile.feature.amount || 2;
    champ.knot += amt;
    tile.feature.mined = true;
    addLogEntry(state, {
      category: LOG_CATEGORY.ECONOMY,
      subject: championSegment(champ.name, factionMap),
      verb: 'mines',
      object: null,
      detail: { text: `${amt} God's Knot`, color: 'var(--gold)' },
    });
    recordLedgerEntry(champ, `+${amt} God's Knot — mined`, 'gain', 'knot');
    tile.feature = null;
  }
}
