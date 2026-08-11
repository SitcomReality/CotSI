/**
 * panel/teleport.js — Teleport click handler bridging hexBridge.js.
 *
 * Layer: dev/ — imports cheats for teleport logic and runtime for refresh.
 */

import { teleportToHex } from '../cheats/movement.js';
import { devState } from '../cheats/state.js';
import { refreshAll } from '../../runtime/refreshAll.js';

/**
 * Called by hexBridge.js when a hex is clicked.
 * If teleport mode is active, teleports the champion there.
 * @param {{ q: number, r: number }} hex
 * @returns {boolean} true if the click was consumed by teleport
 */
export function handleTeleportClick(hex) {
  if (!devState.teleportMode) return false;
  teleportToHex(hex);
  refreshAll();
  return true;
}
