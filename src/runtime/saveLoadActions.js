/**
 * saveLoadActions.js — Action-bus handlers for the save slot UI.
 *
 * Manual save via the Options modal; loading happens from the setup screen's
 * Continue button only. Exit-to-menu saves and reloads, so a restored game
 * always starts on a fresh page (no live 3D-scene rebuild needed).
 */
import { registerAction } from '../shared/actionBus.js';
import { toast } from '../ui/hud.js';
import { G } from '../game/state/liveGame.js';
import { deferredGameStart } from './beginGame.js';
import {
  saveGameToSlot,
  loadGameFromSlot,
  hasSavedGame,
} from './gameSaveSlot.js';

registerAction('saveGame', () => {
  if (!G) {
    toast('No game in progress to save.', true);
    return;
  }
  const ok = saveGameToSlot();
  toast(ok ? 'Game saved.' : 'Save failed.', !ok);
});

registerAction('saveAndExitToSetup', () => {
  if (G) saveGameToSlot();
  location.reload();
});

registerAction('continueSavedGame', () => {
  // Shares __beginGame's heavy-start flow: hide setup, show the loading
  // screen, then deserialize off the paint (it regenerates the map).
  deferredGameStart(() => {
    const state = loadGameFromSlot();
    if (!state) toast('No usable save found.', true);
    return state;
  });
});

/**
 * Reveal the setup-screen Continue button when a parseable save exists.
 * Call once after templates are injected.
 */
export function initSaveEntryPoints() {
  const btn = document.getElementById('continueBtn');
  if (btn) btn.hidden = !hasSavedGame();
}
