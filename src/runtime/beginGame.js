import { createGame } from '../game/state/gameFactory.js';
import { setGameInstance } from '../game/state/liveGame.js';
import { setGameState } from '../ui/combat/combatModal.js';
import { syncSize } from '../render/overlays/overlayStack.js';
import {
  getSceneContext,
  resetCamera as resetCamera3D,
} from '../render/hexmap3d/hexMapRenderer.js';
import { bindHeaderEvents } from '../ui/panels/headerPanel.js';
import { refreshAll } from './refreshAll.js';
import { initHeptagramWidget } from '../ui/heptagramWidget.js';

/** Guard: prevent duplicate window resize listener registration. */
let resizeWired = false;

export function __beginGame(config) {

  const game = createGame(config);
  setGameInstance(game);      // sets live G + window.__gameState
  setGameState(game);         // keep combatModal in sync

  if (!resizeWired) {
    window.addEventListener('resize', syncSize);
    resizeWired = true;
  }

  const setupEl = document.getElementById('setup');
  const gameEl = document.getElementById('game');

  if (setupEl) setupEl.style.display = 'none';
  if (gameEl) {
    gameEl.style.display = 'grid';
    // Force synchronous layout reflow so children (especially #mapMount) have
    // non-zero dimensions when initHexMap3D reads them in the same call stack.
    gameEl.offsetHeight;
  } else {
    console.error('[beginGame] #game element NOT FOUND — game layout template may not be appended');
  }

  const ctx3d = getSceneContext();
  if (ctx3d) {
    resetCamera3D(ctx3d.getCameraState());
    ctx3d.applyCamera();
  }
  bindHeaderEvents();
  initHeptagramWidget('paleyMount');
  refreshAll();
}

window.__beginGame = __beginGame;
