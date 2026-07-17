import { createGame } from '../gameFactory.js';
import { setGameInstance } from './liveGame.js';
import { setGameState } from '../../ui/combat/combatui-index.js';
import { syncSize } from '../../render/effects/effectsOverlay.js';
import {
  getSceneContext,
  resetCamera as resetCamera3D,
} from '../../render/hexmap3d/hexmap3d-index.js';
import { bindGameUI } from '../../ui/gameUIBindings.js';
import { bindHeaderEvents } from '../../ui/bindHeader.js';
import { refreshAll } from '../gameOrchestrator.js'; // will move to ./refreshAll.js in Step 6
import { initHeptagramWidget } from '../../ui/heptagramWidget.js';

export function __beginGame(config) {
  const game = createGame(config);
  setGameInstance(game);      // sets live G + window.__gameState
  setGameState(game);         // keep combatModal in sync

  window.addEventListener('resize', syncSize);

  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'grid';

  const ctx3d = getSceneContext();
  if (ctx3d) {
    resetCamera3D(ctx3d.getCameraState());
    ctx3d.applyCamera();
  }

  bindGameUI();
  bindHeaderEvents();
  initHeptagramWidget('paleyMount');  // one-time: SVG fills the now-static #paleyMount
  refreshAll();
}

window.__beginGame = __beginGame;