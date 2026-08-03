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
import { DIG_RELIC_CHANCE, DIG_POTENCY_CHANCE, DIG_GOLD_BASE, DIG_GOLD_RANDOM, DIG_GOLD_DAY_DIVISOR } from '../../params/game/economyParams.js';
import { FACTION_EVERKNOWN, FACTION_COUNT } from '../../params/game/factionParams.js';

export function resolvePendingDig(state, ch) {
  ch.pendingDig = false;
  const roll = state._rng();
  const factionMap = buildChampionFactionMap(state.champions);
  if (roll < DIG_RELIC_CHANCE) {
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
    if (ch.faction === FACTION_EVERKNOWN) {
      const rf = Math.floor(state._rng() * FACTION_COUNT);
      ch.potencies[rf]++;
      recordLedgerEntry(ch, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain', 'potency');
    }
  } else if (roll < DIG_POTENCY_CHANCE) {
    const f = Math.floor(state._rng() * FACTION_COUNT);
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
    const gold = DIG_GOLD_BASE + Math.floor(state._rng() * DIG_GOLD_RANDOM) + Math.floor(state.day / DIG_GOLD_DAY_DIVISOR);
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
