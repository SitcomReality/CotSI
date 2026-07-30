// combatModal.js — public API re-exports and initializer
export { startCombat, closeCombat } from './combatLifecycle.js';
import { setGameState, setCallbacks, setFinishAttackerTurn } from './combatUiState.js';
export { setGameState, setCallbacks };
export { openRewardModal, openTrader } from './combatRewardUI.js';
export { openArtifactChoiceModal } from '../modals/artifactChoiceModal.js';
import { wireCombatActions } from './combatInteractions.js';

export function initCombatModal(deps) {
  setCallbacks(deps.refreshAll, deps.toast, deps.startMeasure, deps.endMeasure, deps.setGameContext, deps.clearGameContext);
  if (deps.finishAttackerTurn) setFinishAttackerTurn(deps.finishAttackerTurn);
  wireCombatActions();
}
