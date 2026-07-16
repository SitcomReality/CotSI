/**
 * Combat module — barrel re-export
 * Provides all combat-related functions under one import path.
 */
export {
  createCombatState,
  getActiveCombatant,
  isPickingPhase,
  isRevealPhase,
} from './combatState.js';

export {
  recordCombatPick,
  advanceCombatPhase,
  botCombatPick,
  getAvailablePicks,
} from './combatPicks.js';

export {
  applyFinalBonuses,
  processReveal,
} from './combatScoring.js';

export {
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
} from './combatDamage.js';