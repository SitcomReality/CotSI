/**
 * Combat module — barrel re-export
 * Provides all combat-related functions under one import path.
 */
export {
  createCombatState,
  deriveOrder,
  sideOf,
  entityFor,
  getActiveCombatant,
  isPickingPhase,
  isRevealPhase,
} from './combatState.js';

export {
  recordPick,
  bothPicksIn,
  advancePhase,
  botCombatPick,
  getAvailablePicks,
} from './combatPicks.js';

export {
  scorePickPair,
  applyFinalBonuses,
  processReveal,
} from './combatScoring.js';

export {
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
} from './combatDamage.js';