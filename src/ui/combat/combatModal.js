// combatModal.js — public API re-exports and initializer
export { startCombat, closeCombat } from './combatLifecycle.js';
import { setGameState, setCallbacks, setFinishAttackerTurn } from './combatUiState.js';
export { setGameState, setCallbacks };
export { openRewardModal, openTrader } from './combatRewardUI.js';
export { openArtifactChoiceModal } from '../modals/rewardModal.js';
import { wireCombatActions } from './combatInteractions.js';

export function initCombatModal(deps) {
  setCallbacks(deps.refreshAll, deps.toast, deps.startMeasure, deps.endMeasure);
  if (deps.finishAttackerTurn) setFinishAttackerTurn(deps.finishAttackerTurn);
  wireCombatActions();
}
