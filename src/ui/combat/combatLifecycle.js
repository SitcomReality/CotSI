import { createCombatState } from '../../game/combat/combat-index.js';

import {
  getCombatUI,
  setCombatUI,
  getGameState
} from './combatStateManager.js';

import { renderCombat } from './combatRenderer.js';
import { showModal, hideModal } from '../modal.js';
import { runCombatFlow } from './combatFlow.js';

/**
 * Start a new combat between two entities.
 * Creates the combat state, opens the modal, and kicks off the async sequencer.
 */
export function startCombat(attacker, defender) {
  if (getCombatUI()) return; // re-entry guard

  const _G = getGameState();
  const combat = createCombatState(_G, attacker, defender);
  setCombatUI(combat);
  openCombatModal();
}

/**
 * Open the combat modal and begin the flow.
 */
export function openCombatModal() {
  showModal('combatModal');
  renderCombat();
  runCombatFlow(); // start the sequence
}

/**
 * Close the combat modal and clear state.
 */
export function closeCombat() {
  hideModal('combatModal');
  setCombatUI(null);
}