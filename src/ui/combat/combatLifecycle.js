import { createCombatState } from '../../game/state/combat/index.js';

import {
  getCombatUI,
  setCombatUI,
  getGameState,
  getFinishAttackerTurn,
} from './combatUiState.js';

import { renderCombat } from './combatRenderer.js';
import { showModal, hideModal } from '../modals/modalShell.js';
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
 * If the combat initiator (attacker) is the active champion, their turn
 * ends immediately — the turn advances to the next champion.
 */
export function closeCombat() {
  // Capture attacker identity before combat state is cleared
  const combat = getCombatUI();
  const attackerId = combat?.attacker?.id;
  const _G = getGameState();

  try {
    hideModal('combatModal');
  } finally {
    setCombatUI(null);
  }

  // End the attacker's turn if they started combat and are still active
  if (attackerId && _G && _G.activeChampionId === attackerId) {
    const endTurn = getFinishAttackerTurn();
    if (endTurn) endTurn();
  }
}