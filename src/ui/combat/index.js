// index.js – public API re-exports and initializer
export { startCombat, closeCombat } from './lifecycle.js';
import { setGameState, setCallbacks } from './state.js';
export { setGameState, setCallbacks };
export { openArtifactChoiceModal, openTrader } from './reward.js';

export function initCombatModal(deps) {
  setCallbacks(deps.refreshAll, deps.toast);
}
