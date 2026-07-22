/**
 * turnActions.js — Per-champion turn orchestrator.
 *
 * Delegates to artifactDraft, digSystem, and factionAbilities for
 * most sub-systems. The artifact passives (Beggar-Saint's Ledger,
 * Patient Bandage) remain inline since they are simple conditional
 * checks.
 *
 * For human champions, beginTurn ends by setting `state.dispatch` —
 * the Augur's Dispatch report, which the runtime shows before
 * anything else.
 */
import { buildDispatchReport } from '../rules/dispatchReport.js';
import { getChampion } from './entityQueries.js';
import { dailyMoves } from './championMovement.js';
import { refreshVision } from './fogOfWar.js';
import { recordLedgerEntry, drainLedger } from './dispatchLedger.js';
import { processReverie } from './factionAbilities.js';
import { resolvePendingDig } from './digSystem.js';
import { processFirstTurnDraft } from './artifactDraft.js';

export function beginTurn(state, champId) {
  const ch = getChampion(state, champId);
  if (!ch || !ch.alive) return;
  ch.moves = dailyMoves(state, ch);
  ch.lastActionCombat = false;
  // Artifact passives
  if (ch.artifact === 'ledger') {
    ch.gold += 2;
    recordLedgerEntry(ch, "+2 gold — Beggar-Saint's Ledger", 'gain', 'gold');
  }
  if (ch.artifact === 'bandage') {
    const healed = Math.min(ch.maxHp, ch.hp + 2) - ch.hp;
    ch.hp += healed;
    if (healed > 0) recordLedgerEntry(ch, `+${healed} HP — Patient Bandage`, 'gain', 'hp');
  }
  // Faction abilities (Reverie)
  if (ch.faction === 1) processReverie(state, ch);
  // Pending dig resolution
  if (ch.pendingDig) resolvePendingDig(state, ch);
  // First-turn artifact draft
  if (!ch.offeredArtifact) processFirstTurnDraft(state, ch);
  // Vision refresh
  refreshVision(state);
  // Augur's Dispatch: snapshot the report for human champions.
  if (ch.controller === 'human') {
    state.dispatch = {
      championId: ch.id,
      report: buildDispatchReport(state, ch, drainLedger(ch)),
    };
  }
}

export { isDigEligible } from './digSystem.js';
