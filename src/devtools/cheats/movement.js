/**
 * cheats/movement.js — Movement cheat functions.
 *
 * Layer: dev/ — imports game/state, engine.
 */

import { CHEAT_FILL_AP_AMOUNT } from '../../params/devtools/cheatParams.js';
import { G, currentChamp } from '../../game/state/liveGame.js';
import { moveChampion } from '../../game/state/championMovement.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { setPathPreview } from '../../render/overlays/overlayStack.js';
import { toast } from '../../ui/hud.js';
import { devState } from './state.js';

export function cheatFillMoves() {
  const ch = currentChamp();
  if (!ch) return;
  ch.actionPoints = CHEAT_FILL_AP_AMOUNT;
  toast(`AP set to ${CHEAT_FILL_AP_AMOUNT}`);
}

/**
 * Toggle click-to-walk vs click-to-preview → click-to-confirm movement
 * (dev/docs/movementDesign.md §8). Default is click-to-walk; the devtools
 * button lets us A/B the two during testing.
 */
export function cheatToggleMoveMode() {
  devState.movePreviewMode = !devState.movePreviewMode;
  setPathPreview(null); // drop any lingering preview overlay from the old mode
  const btn = document.getElementById('devMoveModeBtn');
  if (btn) {
    btn.textContent = devState.movePreviewMode ? 'Move Mode: Preview' : 'Move Mode: Walk';
    btn.classList.toggle('is-active', devState.movePreviewMode);
  }
  toast(devState.movePreviewMode
    ? 'Move Mode: click to preview path, click again to walk'
    : 'Move Mode: click to walk');
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
