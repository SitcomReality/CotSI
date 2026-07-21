/**
 * devCheats.js — Cheat/debug functions for the dev tools panel.
 *
 * All functions read game state from the live binding. They are registered
 * as data-action handlers by devTools.js.
 *
 * Layer: dev/ — imports game/state/ modules.
 */

import { G, currentChamp } from '../game/state/liveGame.js';
import { getCombatUI } from '../ui/combat/combatUiState.js';
import { moveChampion } from '../game/state/championMovement.js';
import { coordKey } from '../engine/rules/hexGrid.js';
import { toast } from '../ui/hud.js';

// ─── Dev state (shared with devTools.js) ───────────────────────────────────

export const devState = {
  teleportMode: false,
};

// ─── Resource cheats ───────────────────────────────────────────────────────

export function cheatGold10() {
  const ch = currentChamp();
  if (!ch) { console.warn('[devCheats] no active champion'); return; }
  ch.gold += 10;
  toast('+10 gold');
}

export function cheatHp50() {
  const ch = currentChamp();
  if (!ch) return;
  ch.hp = Math.min(ch.maxHp, ch.hp + 50);
  toast('+50 HP');
}

export function cheatHpFull() {
  const ch = currentChamp();
  if (!ch) return;
  ch.hp = ch.maxHp;
  toast('HP fully restored');
}

export function cheatRelic1() {
  const ch = currentChamp();
  if (!ch) return;
  ch.relics += 1;
  toast('+1 relic');
}

export function cheatKnot5() {
  const ch = currentChamp();
  if (!ch) return;
  ch.knot += 5;
  toast('+5 God\'s Knot');
}

export function cheatPotencyAll() {
  const ch = currentChamp();
  if (!ch) return;
  for (let i = 0; i < ch.potencies.length; i++) {
    ch.potencies[i] += 3;
  }
  toast('+3 all potency');
}

// ─── Movement cheats ───────────────────────────────────────────────────────

export function cheatFillMoves() {
  const ch = currentChamp();
  if (!ch) return;
  ch.moves = 50;
  toast('Moves set to 50');
}

export function cheatTeleport() {
  devState.teleportMode = !devState.teleportMode;
  const btn = document.getElementById('devTeleportBtn');
  if (btn) {
    btn.textContent = devState.teleportMode ? 'Teleport Mode: ON' : 'Teleport Mode: OFF';
    btn.classList.toggle('is-active', devState.teleportMode);
  }
  if (devState.teleportMode) {
    toast('Teleport mode ON — click any hex to move');
  } else {
    toast('Teleport mode OFF');
  }
}

/**
 * Handle a hex click during teleport mode.
 * Called from hexBridge.js when devState.teleportMode is true.
 * @param {{ q: number, r: number }} hexCoords
 * @returns {boolean} true if teleport was executed
 */
export function teleportToHex(hexCoords) {
  const ch = currentChamp();
  if (!ch) return false;
  const key = coordKey(hexCoords);
  // Direct move — bypass range checks. cost=0 so we don't consume moves.
  moveChampion(G, ch, key, 0);
  devState.teleportMode = false;
  const btn = document.getElementById('devTeleportBtn');
  if (btn) {
    btn.textContent = 'Teleport Mode: OFF';
    btn.classList.remove('is-active');
  }
  toast(`Teleported to ${key}`);
  return true;
}

// ─── Combat cheats ─────────────────────────────────────────────────────────

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
