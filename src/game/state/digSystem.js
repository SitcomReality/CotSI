/**
 * digSystem.js — Pending dig resolution and dig eligibility checks.
 */
import { FACTIONS } from '../rules/factionData.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { occupiedByMob } from './entityQueries.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment, factionAccentVar } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { G } from './liveGame.js';

export function resolvePendingDig(state, ch) {
  ch.pendingDig = false;
  const roll = state._rng();
  const factionMap = buildChampionFactionMap(state.champions);
  if (roll < 0.075) {
    ch.relics++;
    addLogEntry(state, {
      category: LOG_CATEGORY.ECONOMY,
      subject: championSegment(ch.name, factionMap),
      verb: 'dug up',
      object: { text: 'a relic', color: 'var(--gold)' },
      detail: null,
    });
    recordLedgerEntry(ch, '+1 relic — night dig', 'gain', 'relic');
    if (ch.controller === 'human' && !state.reward) {
      state.reward = {
        championId: ch.id,
        type: 'treasure',
        title: 'A relic under the dust',
        body: 'Divine shard, still warm.',
        guaranteed: [
          { icon: 'i-relic', label: '+1 relic' },
          { icon: 'i-potency', label: `+1 ${FACTIONS[ch.faction].name} potency` },
        ],
        choices: null,
      };
    }
    // Archive racial
    if (ch.faction === 3) {
      const rf = Math.floor(state._rng() * 7);
      ch.potencies[rf]++;
      recordLedgerEntry(ch, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain', 'potency');
    }
  } else if (roll < 0.33) {
    const f = Math.floor(state._rng() * 7);
    ch.potencies[f]++;
    addLogEntry(state, {
      category: LOG_CATEGORY.ECONOMY,
      subject: championSegment(ch.name, factionMap),
      verb: 'dug up',
      object: { text: `a ${FACTIONS[f].name} potency`, color: factionAccentVar(f) },
      detail: null,
    });
    recordLedgerEntry(ch, `+1 ${FACTIONS[f].name} potency — night dig`, 'gain', 'potency');
  } else {
    const gold = 7 + Math.floor(state._rng() * 12) + Math.floor(state.day / 7);
    ch.gold += gold;
    addLogEntry(state, {
      category: LOG_CATEGORY.ECONOMY,
      subject: championSegment(ch.name, factionMap),
      verb: 'dug up',
      object: { text: `${gold} gold`, color: 'var(--gold)' },
      detail: null,
    });
    recordLedgerEntry(ch, `+${gold} gold — night dig`, 'gain', 'gold');
  }
}

export function isDigEligible(state, champ) {
  const key = coordKey(champ.pos);
  const tile = state.tiles[key];
  return TERRAIN[tile.terrain].passable && !tile.feature && !occupiedByMob(state, key) && !champ.lastActionCombat;
}
