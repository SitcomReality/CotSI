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
  console.log('[beginGame] starting with config seed:', config.seed, 'radius:', config.radius);

  const game = createGame(config);
  setGameInstance(game);      // sets live G + window.__gameState
  setGameState(game);         // keep combatModal in sync

  if (!resizeWired) {
    window.addEventListener('resize', syncSize);
    resizeWired = true;
  }

  const setupEl = document.getElementById('setup');
  const gameEl = document.getElementById('game');
  console.log('[beginGame] #setup:', !!setupEl, '#game:', !!gameEl);

  if (setupEl) setupEl.style.display = 'none';
  if (gameEl) {
    gameEl.style.display = 'grid';
    // Force synchronous layout reflow so children (especially #mapMount) have
    // non-zero dimensions when initHexMap3D reads them in the same call stack.
    gameEl.offsetHeight;

    // DEBUG: visible outline to confirm #game is rendered and sized
    gameEl.style.outline = '4px dashed red';

    console.log('[beginGame] #game display:', getComputedStyle(gameEl).display, 'rect:', gameEl.getBoundingClientRect().width + 'x' + gameEl.getBoundingClientRect().height);
  } else {
    console.error('[beginGame] #game element NOT FOUND — game layout template may not be appended');
  }

  const ctx3d = getSceneContext();
  if (ctx3d) {
    resetCamera3D(ctx3d.getCameraState());
    ctx3d.applyCamera();
  }

  console.log('[beginGame] binding header events');
  bindHeaderEvents();
  console.log('[beginGame] initializing heptagram widget');
  initHeptagramWidget('paleyMount');
  console.log('[beginGame] calling refreshAll');
  refreshAll();
  console.log('[beginGame] done');
}

window.__beginGame = __beginGame;
