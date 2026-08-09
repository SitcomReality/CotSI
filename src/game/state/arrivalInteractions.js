/**
 * arrivalInteractions.js — Resource harvesting on champion arrival.
 * Handles the legacy kinds (fruit eating, knot mining, treasure chest opening) and
 * delegates every other kind to the feature rewards engine (featureRewards.js).
 */
import { coordKey } from '../../engine/rules/hexGrid.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { interactWithFeature } from './featureRewards.js';
import { FRUIT_HEAL_VERDANT, FRUIT_HEAL_STANDARD, FRUIT_REGROWTH_DAYS, KNOT_DEFAULT_AMOUNT, CHEST_GOLD_BASE } from '../../params/game/economyParams.js';
import { FACTION_VERDANT } from '../../params/game/factionParams.js';
import { markChunkDirty } from './chunkDirtyTracking.js';

export function interactOnArrival(state, champ) {
  const factionMap = buildChampionFactionMap(state.champions);
  const tile = state.tiles[coordKey(champ.pos)];
  if (tile.feature?.kind === 'fruitTree' && tile.feature.ripe !== false) {
    if (!tile.feature.nextRewardDay || state.day >= tile.feature.nextRewardDay) {
      const heal = champ.faction === FACTION_VERDANT ? FRUIT_HEAL_VERDANT : FRUIT_HEAL_STANDARD;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      tile.feature.nextRewardDay = state.day + FRUIT_REGROWTH_DAYS;
      tile.feature.ripe = false;
      state._regrowingFeatures.add(coordKey(champ.pos));
      // Feature state changed — rebuild the chunk so the fruit regrow shows.
      markChunkDirty(state, tile.q, tile.r);
      addLogEntry(state, {
        category: LOG_CATEGORY.HEAL,
        subject: championSegment(champ.name, factionMap),
        verb: 'eats moonberries',
        object: null,
        detail: { text: `+${heal} HP`, color: 'var(--verdigris)' },
      });
      recordLedgerEntry(champ, `+${heal} HP — moonberry`, 'gain', 'hp');
    }
  }
  if (tile.feature?.kind === 'knot' && !tile.feature.mined) {
    const amt = tile.feature.amount || KNOT_DEFAULT_AMOUNT;
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
    // Feature removed — rebuild the chunk so decorations restore (de-emphasis).
    markChunkDirty(state, tile.q, tile.r);
  }
  if (tile.feature?.kind === 'treasureChest') {
    const amt = tile.feature.amount || CHEST_GOLD_BASE;
    champ.gold += amt;
    tile.feature = null;
    addLogEntry(state, {
      category: LOG_CATEGORY.ECONOMY,
      subject: championSegment(champ.name, factionMap),
      verb: 'opens',
      object: null,
      detail: { text: `+${amt} gold — treasure chest`, color: 'var(--gold)' },
    });
    recordLedgerEntry(champ, `+${amt} gold — treasure chest`, 'gain', 'gold');
    // Feature removed — rebuild the chunk so decorations restore (de-emphasis).
    markChunkDirty(state, tile.q, tile.r);
  }
  // Every other kind is handled by the feature rewards engine (tree and bush
  // are scenery and no-op inside).
  if (tile.feature && tile.feature.kind !== 'fruitTree' && tile.feature.kind !== 'knot' && tile.feature.kind !== 'treasureChest') {
    interactWithFeature(state, champ, tile);
  }
}
