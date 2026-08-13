/**
 * baseInteraction.js — Sanctuary heal at a champion's own faction base.
 * References `G` via live binding (circular import, used at runtime only).
 *
 * Foreign-base potency purchases now go through the trade screen
 * (runtime/trade/trade.js) instead of this quick action.
 */
import { G } from './liveGame.js';
import { addLogEntry } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';
import { SANCTUARY_HEAL_FRACTION } from '../../params/game/economyParams.js';

/**
 * Heal a champion resting at their own faction's base.
 * @param {object} ch   — the arriving champion
 * @param {object} tile — the base tile (feature.kind === 'base', own faction)
 * @returns {{ ok: boolean, reason?: string }}
 */
export function sanctuaryAtBase(ch, tile) {
  if (tile.feature.faction !== ch.faction) {
    return { ok: false, reason: 'Not your sanctuary.' };
  }

  const factionMap = buildChampionFactionMap(G.champions);
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
}
