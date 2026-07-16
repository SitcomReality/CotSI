import { getCombatUI, setCombatUI, getGameState } from './combatStateManager.js';
import { getActiveCombatant, getAvailablePicks, botCombatPick, recordCombatPick, advanceCombatPhase, isPickingPhase } from '../../game/combat/combat-index.js';
import { renderCombat } from './combatRenderer.js';

export function makeBotPick() {
  const _combatUI = getCombatUI();
  if (!_combatUI || !isPickingPhase(_combatUI)) return;
  const entity = getActiveCombatant(_combatUI);
  if (!entity || entity.controller !== 'bot') return;

  const opponentPicks = _combatUI.awaitingPick === 'attacker'
    ? _combatUI.roundPicks.defender
    : _combatUI.roundPicks.attacker;

  const available = getAvailablePicks(entity);
  const pick = botCombatPick(entity, opponentPicks, available);
  if (pick == null) return;

  recordCombatPick(_combatUI, pick);
  advanceCombatPhase(_combatUI);
  renderCombat();

  // Chain if the next phase is also a bot pick
  if (isPickingPhase(_combatUI)) {
    const nextActive = getActiveCombatant(_combatUI);
    if (nextActive && nextActive.controller === 'bot') {
      setTimeout(() => makeBotPick(), 500);
    }
  }
}

// Global handler for the "Commit Power" button
window.commitCombat = function () {
  const _combatUI = getCombatUI();
  if (!_combatUI) return;

  const entity = getActiveCombatant(_combatUI);
  if (!entity || entity.controller !== 'human') return;

  advanceCombatPhase(_combatUI);
  renderCombat();

  // If the next phase is a bot pick, trigger it
  if (isPickingPhase(_combatUI)) {
    const nextActive = getActiveCombatant(_combatUI);
    if (nextActive && nextActive.controller === 'bot') {
      setTimeout(() => makeBotPick(), 500);
    }
  }
};

// Global handler for closing the reward modal
window.closeReward = function () {
  document.getElementById('rewardModal').style.display = 'none';
  // Safety: also clear G.reward if it exists
  const state = getGameState();
  if (state) state.reward = null;
};