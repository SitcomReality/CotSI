/**
 * factionAbilities.js — Start-of-turn faction-specific effects.
 */
import { FACTIONS } from '../rules/factionData.js';
import { G } from './liveGame.js';
import { addLogEntry } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';

export function processReverie(state, ch) {
  const roll = Math.floor(state._rng() * 5);
  if (roll === 0) {
    ch.gold += 4;
    recordLedgerEntry(ch, "+4 gold — Another's Dream", 'gain', 'gold');
  } else if (roll === 1) {
    ch.moves += 1;
    recordLedgerEntry(ch, "+1 move — Another's Dream", 'gain', 'move');
  } else if (roll === 2) {
    const healed = Math.min(ch.maxHp, ch.hp + 4) - ch.hp;
    ch.hp += healed;
    if (healed > 0) recordLedgerEntry(ch, `+${healed} HP — Another's Dream`, 'gain', 'hp');
  } else if (roll === 4) {
    const f = Math.floor(state._rng() * 7);
    ch.potencies[f] += 1;
    recordLedgerEntry(ch, `+1 ${FACTIONS[f].name} potency — Another's Dream`, 'gain', 'potency');
  } else {
    recordLedgerEntry(ch, "The dream was silent — Another's Dream", 'neutral', 'info');
  }
  const factionMap = buildChampionFactionMap(state.champions);
  addLogEntry(state, `${ch.name} receives a Reverie dream.`, [
    championSegment(ch.name, factionMap),
    ' receives a Reverie dream.',
  ]);
}
