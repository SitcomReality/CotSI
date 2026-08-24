/**
 * arrivalInteractions.js — Resource harvesting on champion arrival.
 * Handles the legacy kinds (fruit eating, knot mining, treasure chest opening) and
 * delegates every other kind to the feature rewards engine (featureRewards.js).
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { recordLedgerEntry } from '../world/dispatchLedger.js';
import { interactWithFeature } from './featureRewards.js';
import { enterDungeon } from './dungeonSystem.js';
import { offerForgeUpgrade } from './forgeSystem.js';
import { depleteFeature } from './featureRegrowth.js';
import { BLESSED_FONT_HEAL_VERDANT, BLESSED_FONT_HEAL_STANDARD, KNOT_DEFAULT_AMOUNT, CHEST_GOLD_BASE } from '../../../params/game/economyParams.js';
import { FACTION_VERDANT } from '../../../params/game/factionParams.js';
import { markChunkDirty } from '../world/chunkDirtyTracking.js';

export function interactOnArrival(state, champ) {
  const factionMap = buildChampionFactionMap(state.champions);
  const tile = state.tiles[coordKey(champ.pos)];
  // Dungeons: entering happens on arrival (human champions only; eligibility
  // checked inside). Ineligible champions simply stand on the hex.
  if (tile.feature?.kind === 'dungeon') {
    enterDungeon(state, champ);
    return;
  }
  // Forges: permanent upgrade sites (human champions with something to
  // upgrade get the choice modal; the feature is never consumed).
  if (tile.feature?.kind === 'forge') {
    offerForgeUpgrade(state, champ);
    return;
  }
  if (tile.feature?.kind === 'blessedFont' && tile.feature.ripe !== false) {
    if (!tile.feature.nextRewardDay || state.day >= tile.feature.nextRewardDay) {
      const heal = champ.faction === FACTION_VERDANT ? BLESSED_FONT_HEAL_VERDANT : BLESSED_FONT_HEAL_STANDARD;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      depleteFeature(state, tile);
      addLogEntry(state, {
        category: LOG_CATEGORY.HEAL,
        subject: championSegment(champ.name, factionMap),
        verb: 'drinks from the Blessed Font',
        object: null,
        detail: { text: `+${heal} HP`, color: 'var(--verdigris)' },
      });
      recordLedgerEntry(champ, `+${heal} HP — Blessed Font`, 'gain', 'hp');
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
  if (tile.feature && tile.feature.kind !== 'blessedFont' && tile.feature.kind !== 'knot' && tile.feature.kind !== 'treasureChest') {
    interactWithFeature(state, champ, tile);
  }
}
