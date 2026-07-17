// index.js – public API re-exports and initializer
export { startCombat, closeCombat } from './combatLifecycle.js';
import { setGameState, setCallbacks } from './combatStateManager.js';
export { setGameState, setCallbacks };
export { openRewardModal, openTrader } from './combatRewardUI.js';
export { openArtifactChoiceModal } from '../modal.js';

export function initCombatModal(deps) {
  setCallbacks(deps.refreshAll, deps.toast);
}
