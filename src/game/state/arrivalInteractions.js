/**
 * arrivalInteractions.js — Resource harvesting on champion arrival.
 * Handles fruit eating, knot mining, etc.
 */
import { coordKey } from '../../engine/rules/hexGrid.js';
import { addLog } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';

export function interactOnArrival(state, champ) {
  const tile = state.tiles[coordKey(champ.pos)];
  if (tile.feature?.kind === 'tree' && tile.feature.ripe !== false) {
    if (!tile.feature.nextFruitDay || state.day >= tile.feature.nextFruitDay) {
      const heal = champ.faction === 2 ? 34 : 18;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      tile.feature.nextFruitDay = state.day + 4;
      tile.feature.ripe = false;
      addLog(state, `${champ.name} eats manuscript fruit (+${heal} HP).`);
      recordLedgerEntry(champ, `+${heal} HP — manuscript fruit`, 'gain', 'hp');
    }
  }
  if (tile.feature?.kind === 'knot' && !tile.feature.mined) {
    const amt = tile.feature.amount || 2;
    champ.knot += amt;
    tile.feature.mined = true;
    addLog(state, `${champ.name} mines ${amt} God's Knot.`);
    recordLedgerEntry(champ, `+${amt} God's Knot — mined`, 'gain', 'knot');
    tile.feature = null;
  }
}
