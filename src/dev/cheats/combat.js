/**
 * cheats/combat.js — Combat cheat functions.
 *
 * Layer: dev/ — imports runtime/combat (read-only combat-state access).
 */

import { CHEAT_COMBAT_DAMAGE_DEFAULT, CHEAT_COMBAT_WIN_ATTACKER_SCORE, CHEAT_COMBAT_WIN_DEFENDER_SCORE } from '../../params/dev/cheatParams.js';
import { getCombatUI } from '../../runtime/combat/combatState.js';
import { toast } from '../../ui/hud.js';

export function cheatCombatDamage(amount = CHEAT_COMBAT_DAMAGE_DEFAULT) {
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
  combat.roundScores.attacker = CHEAT_COMBAT_WIN_ATTACKER_SCORE;
  combat.roundScores.defender = CHEAT_COMBAT_WIN_DEFENDER_SCORE;
  combat.phase = 'roundEnd';
  combat.awaitingSide = null;
  toast('Combat instant win set');
}
