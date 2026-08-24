import { createGame } from '../game/state/gameFactory.js';
import { G, setGameInstance } from '../game/state/liveGame.js';
import { syncSize } from '../render/overlays/overlayStack.js';
import {
  getSceneContext,
  fitCameraToMap,
} from '../render/hexmap3d/hexMapRenderer.js';
import { bindHeaderEvents } from '../ui/panels/headerPanel.js';
import { refreshAll } from './refreshAll.js';
import { initHeptagramWidget } from '../ui/heptagramWidget.js';
import { getClock } from '../shared/clockScheduler.js';
import { SETUP_DEFER_MS } from '../params/ui/uiParams.js';
import { startMusic } from './audio/musicDirector.js';

/** Guard: prevent duplicate window resize listener registration. */
let resizeWired = false;

/** Guard: ignore a second Start click while a game is still being created. */
let gameStarting = false;

/**
 * Present an already-built game state: make it live and run every render/DOM
 * init step shared by "start a new game" and "load a saved game".
 * @param {object} game - freshly created or deserialized game state
 */
export function presentGame(game) {
  setGameInstance(game);      // sets live G + window.__gameState

  if (!resizeWired) {
    window.addEventListener('resize', syncSize);
    resizeWired = true;
  }

  // Hide loading screen, show the game grid.
  const loadingEl = document.getElementById('loading-screen');
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
    // On game restart, re-fit the camera to the sight-disc view
    fitCameraToMap(ctx3d.getCameraState());
    ctx3d.applyCamera();
  }
  bindHeaderEvents(() => G);
  initHeptagramWidget('paleyMount');
  startMusic(); // fire-and-forget; user gesture (Start click) unlocked audio
  refreshAll();
}

/**
 * Shared heavy-start flow: show the loading screen, then run the expensive
 * state factory on a deferred clock task so the browser can paint first.
 * Used by both "start a new game" and "continue a saved game".
 * @param {() => object|null} buildState - returns the new game state, or null on failure
 */
export function deferredGameStart(buildState) {
  if (gameStarting) {
    console.warn('[beginGame] game already starting — ignoring duplicate Start');
    return;
  }

  // The clock drives the deferred start below, so it must be ticking before
  // the defer is scheduled (it is normally started later, in initHexMap3D,
  // which runs inside this deferred callback). Idempotent — safe on restart.
  getClock().start();

  // Show loading screen immediately so the player sees it before map generation blocks.
  const loadingEl = document.getElementById('loading-screen');
  const setupEl = document.getElementById('setup');

  if (setupEl) setupEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'flex';

  gameStarting = true;
  getClock().setTimeout(() => {
    try {
      const game = buildState();
      if (!game) {
        // Factory reported failure — back out to the setup screen.
        if (loadingEl) loadingEl.style.display = 'none';
        if (setupEl) setupEl.style.display = '';
        return;
      }
      presentGame(game);
    } finally {
      gameStarting = false;
    }
  }, SETUP_DEFER_MS, 'ui');
}

export function __beginGame(config) {
  deferredGameStart(() => createGame(config));
}

window.__beginGame = __beginGame;
