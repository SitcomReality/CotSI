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
} from './picks.js';

export {
  applyFinalBonuses,
  processReveal,
} from './scoring.js';

export {
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
} from './damage.js';