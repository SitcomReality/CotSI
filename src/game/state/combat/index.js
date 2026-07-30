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
  getAvailablePicks,
} from './combatPicks.js';

export {
  botCombatPick,
  shouldBotFlee,
} from './combatBotAI.js';

export {
  scorePickPair,
  applyFinalBonuses,
  processReveal,
} from './combatScoring.js';

export {
  resolveRoundDamage,
  nextCombatRound,
} from './combatDamage.js';

export {
  fleeFromCombat,
} from './combatFlee.js';

export {
  finalizeCombat,
} from './combatFinalize.js';