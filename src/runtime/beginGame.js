import { createGame } from '../game/state/gameFactory.js';
import { setGameInstance } from '../game/state/liveGame.js';
import { setGameState } from '../ui/combat/combatModal.js';
import { syncSize } from '../render/overlays/overlayStack.js';
import {
  getSceneContext,
  fitCameraToMap,
} from '../render/hexmap3d/hexMapRenderer.js';
import { bindHeaderEvents } from '../ui/panels/headerPanel.js';
import { refreshAll } from './refreshAll.js';
import { initHeptagramWidget } from '../ui/heptagramWidget.js';

/** Guard: prevent duplicate window resize listener registration. */
let resizeWired = false;

export function __beginGame(config) {
  // Show loading screen immediately so the player sees it before map generation blocks.
  const loadingEl = document.getElementById('loading-screen');
  const setupEl = document.getElementById('setup');

  if (setupEl) setupEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'flex';

  // Defer the heavy synchronous createGame so the browser can paint the loading screen.
  setTimeout(() => {
    const game = createGame(config);
    setGameInstance(game);      // sets live G + window.__gameState
    setGameState(game);         // keep combatModal in sync

    if (!resizeWired) {
      window.addEventListener('resize', syncSize);
      resizeWired = true;
    }

    // Hide loading screen, show the game grid.
    if (loadingEl) loadingEl.style.display = 'none';
    const gameEl = document.getElementById('game');
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
      // On game restart, re-fit the camera to the new map's size
      fitCameraToMap(ctx3d.getCameraState(), game.radius);
      ctx3d.applyCamera();
    }
    bindHeaderEvents();
    initHeptagramWidget('paleyMount');
    refreshAll();
  }, 50);
}

window.__beginGame = __beginGame;
