/**
 * cheats/combat.js — Combat cheat functions.
 *
 * Layer: dev/ — imports ui/combat.
 */

import { getCombatUI } from '../../ui/combat/combatUiState.js';
import { toast } from '../../ui/hud.js';

export function cheatCombatDamage(amount = 20) {
  const combat = getCombatUI();
  if (!combat) {
    toast('No active combat', true);
    return;
  }
  // Boost attacker's round score by the given amount
  combat.roundScores.attacker += amount;
  toast(`Attacker score boosted by ${amount}`);
  // Force phase to roundEnd so the flow picks it up
  combat.phase = 'roundEnd';
  combat.awaitingSide = null;
}

export function cheatCombatWin() {
  const combat = getCombatUI();
  if (!combat) {
    toast('No active combat', true);
    return;
  }
  // Set massively high score for attacker, zero for defender
  combat.roundScores.attacker = 9999;
  combat.roundScores.defender = 0;
  combat.phase = 'roundEnd';
  combat.awaitingSide = null;
  toast('Combat instant win set');
}
