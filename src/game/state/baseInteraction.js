/**
 * baseInteraction.js — Pure game logic for base hex interaction.
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G } from './liveGame.js';
import { addLog } from './gameLog.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { FACTIONS } from '../rules/factionData.js';
import { toast } from '../../ui/hud.js';

/**
 * Handle interacting with a base (sanctuary or potency purchase).
 * @param {object} ch
 * @param {object} tile
 */
export function interactBase(ch, tile) {
  if (tile.feature.faction === ch.faction) {
    // Sanctuary — heal 50% max HP
    const healed = Math.ceil(ch.maxHp * 0.5);
    ch.hp = Math.min(ch.maxHp, ch.hp + healed);
    ch.moves = 0;
    addLog(G, `${ch.name} receives sanctuary (+${healed} HP).`);
    recordLedgerEntry(ch, `+${healed} HP — sanctuary`, 'gain', 'hp');
  } else {
    // Buy faction potency
    const cost = ch.faction === 4 ? 14 : 18;
    if (ch.gold >= cost) {
      ch.gold -= cost;
      ch.potencies[tile.feature.faction]++;
      ch.moves = 0;
      addLog(G, `${ch.name} buys ${FACTIONS[tile.feature.faction].name} potency.`);
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
