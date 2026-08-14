/**
 * combatFinalize.js — Final combat resolution and loot distribution.
 *
 * After a combat ends, handles spatial cleanup, loot allocation,
 * log entries, and victory checks.
 */
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { refreshVision } from '../world/fogOfWar.js';
import { checkVictory } from '../world/victoryChecks.js';
import { recordLedgerEntry } from '../world/dispatchLedger.js';
import { removeFromSpatialIndex } from '../entities/spatialIndex.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { FACTIONS } from '../../rules/factionData.js';
import { LOOT_GOLD_BASE, LOOT_GOLD_RANGE } from '../../../params/game/combatParams.js';
import { FACTION_EVERKNOWN, FACTION_COUNT } from '../../../params/game/factionParams.js';

export function finalizeCombat(state, attacker, defender, attackerWon){
  // Remove dead non-champion entities from spatial index
  // (champion deaths are handled via recordDeath in resolveRoundDamage)
  if (!attacker.alive && !state.champions.includes(attacker)) {
    removeFromSpatialIndex(state, coordKey(attacker.pos));
  }
  if (!defender.alive && !state.champions.includes(defender)) {
    removeFromSpatialIndex(state, coordKey(defender.pos));
  }

  const factionMap = buildChampionFactionMap(state.champions);
  attacker.lastActionCombat = true;
  attacker.actionPoints = 0;
  if(attackerWon && attacker.alive && !defender.alive){
    attacker.pos = {...defender.pos};
    refreshVision(state);
    const gold = defender.lootGold ?? (LOOT_GOLD_BASE + Math.floor(state._rng()*LOOT_GOLD_RANGE));
    attacker.gold += gold;
    attacker.relics += 1;
    recordLedgerEntry(attacker, `+${gold} gold, +1 relic — spoils of ${defender.name}`, 'gain', 'relic');
    if(attacker.faction===FACTION_EVERKNOWN){
      const rf = Math.floor(state._rng()*FACTION_COUNT); attacker.potencies[rf] += 1;
      recordLedgerEntry(attacker, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain', 'potency');
    }
    addLogEntry(state, {
      category: LOG_CATEGORY.COMBAT,
      subject: championSegment(attacker.name, factionMap),
      verb: 'defeated',
      object: championSegment(defender.name, factionMap),
      detail: { text: `+${gold}g, +1 relic`, color: 'var(--gold)' },
    });
    return { gold, relic:1 };
  }
  if(!attacker.alive){
    addLogEntry(state, {
      category: LOG_CATEGORY.DEATH,
      subject: championSegment(attacker.name, factionMap),
      verb: 'fell in combat against',
      object: championSegment(defender.name, factionMap),
      detail: null,
    });
  }
  refreshVision(state);
  checkVictory(state);
  return null;
}
