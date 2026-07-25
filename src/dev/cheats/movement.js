/**
 * cheats/movement.js — Movement cheat functions.
 *
 * Layer: dev/ — imports game/state, engine.
 */

import { G, currentChamp } from '../../game/state/liveGame.js';
import { moveChampion } from '../../game/state/championMovement.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { toast } from '../../ui/hud.js';
import { devState } from './state.js';

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
 * Called from hexBridge.js via panel/teleport.js when devState.teleportMode is true.
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
