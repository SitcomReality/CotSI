import { createCombatState } from '../../game/state/combat/index.js';
import { G } from '../../game/state/liveGame.js';

import {
  getCombatUI,
  setCombatUI,
  getFinishAttackerTurn,
} from './combatState.js';

import { renderCombat } from './combatRender.js';
import { showModal, hideModal } from '../../ui/modals/modalShell.js';
import { runCombatFlow } from './combatFlow.js';

/**
 * Start a new combat between two entities.
 * Creates the combat state, opens the modal, and kicks off the async sequencer.
 */
export function startCombat(attacker, defender) {
  if (getCombatUI()) return; // re-entry guard

  const combat = createCombatState(G, attacker, defender);
  setCombatUI(combat);
  openCombatModal();
}

/**
 * Open the combat modal and begin the flow.
 */
function openCombatModal() {
  showModal('combatModal');
  renderCombat(getCombatUI());
  runCombatFlow(); // start the sequence
}

/**
 * Close the combat modal and clear state.
 * If the combat initiator (attacker) is the active champion, their turn
 * ends immediately — the turn advances to the next champion. Dungeon day-3
 * completions suppress that (combat.suppressEndTurn) so the champion keeps
 * their full move turn after conquering the dungeon.
 */
export function closeCombat() {
  // Capture attacker identity before combat state is cleared
  const combat = getCombatUI();
  const attackerId = combat?.attacker?.id;

  try {
    hideModal('combatModal');
  } finally {
    setCombatUI(null);
  }

  // End the attacker's turn if they started combat and are still active
  if (attackerId && G && G.activeChampionId === attackerId && !combat?.suppressEndTurn) {
    const endTurn = getFinishAttackerTurn();
    if (endTurn) endTurn();
  }
}
