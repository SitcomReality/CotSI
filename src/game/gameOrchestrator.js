/**
 * gameOrchestrator — Holds the game instance `G`, exports the central
 * conductor functions (`__beginGame`, `currentChamp`, `refreshAll`),
 * and sets window-level APIs.
 *
 * This is the coordination nexus: state → UI → render.
 */
import { createGame } from './gameFactory.js';
import { checkVictory } from './victory.js';
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext } from '../render/hexmap3d/hexmap3d-index.js';
import { syncSize } from '../render/effects/effectsOverlay.js';
import { resetCamera as resetCamera3D } from '../render/hexmap3d/hexmap3d-index.js';
import { renderLeftPanel, renderRightPanel, renderLog } from '../render/panelComponents.js';
import { initPaleyWidget } from '../ui/paleyWidget.js';
import { setGameState, openArtifactChoiceModal } from '../ui/combat/index.js';
import { showVictory } from '../ui/hud.js';
import { refreshZoomDisplay, getTooltipContent as _getTooltipContent } from '../ui/mapView.js';
import { bindGameUI } from '../ui/gameUIBindings.js';
import { onHexClick } from './hexInteraction.js';
import { runBot } from './turnController.js';

// ---- Game instance (exported live binding) ----
export let G = null;

// ---- Helpers ----

export function currentChamp() {
  return G ? G.champions.find((c) => c.id === G.activeChampionId) : null;
}

// Add a flag to track whether 3D scene is initialized:
let map3dInitialized = false;

// ---- Begin game (called by setup.js) ----

export function __beginGame(config) {
  G = createGame(config);
  window.__gameState = G;
  setGameState(G); // keep combatModal in sync

  // Sync the effects overlay canvas on window resize
  window.addEventListener('resize', syncSize);

  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'grid';

  // Reset 3D camera to default
  const ctx3d = getSceneContext();
  if (ctx3d) {
    resetCamera3D(ctx3d.getCameraState());
    ctx3d.applyCamera();
  }

  bindGameUI();
  refreshAll();
}
window.__beginGame = __beginGame;

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) return;

  window.__gameState = G;

  const ch = currentChamp();

  // Panels
  document.getElementById('leftMount').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightMount').innerHTML = renderRightPanel(G);

  // ── Map (3D replacement) ──
  const mountEl = document.getElementById('mapMount');
  if (!map3dInitialized) {
    // First call: clear mount, init 3D scene
    mountEl.innerHTML = ''; // remove any placeholder
    initHexMap3D(mountEl);
    setupMapInteraction3D(
      onHexClick,
      (key) => _getTooltipContent(G, key, currentChamp())
    );
    map3dInitialized = true;
  }
  renderHexMap3D(G);

  // Paley widget
  initPaleyWidget('paleyMount');

  // Log
  document.getElementById('logMount').innerHTML = renderLog(G);

  // HUD
  if (ch) {
    document.getElementById('hudMoves').textContent = ch.moves;
    document.getElementById('hudPos').textContent = `${ch.pos.q},${ch.pos.r}`;
    document.getElementById('hudSight').textContent =
      ch.sight + (ch.artifact === 'lens' ? 1 : 0);
    document.getElementById('dayLabel').textContent = `Day ${G.day} • ${G.weather.name}`;
    refreshZoomDisplay();
  }

  // Artifact choice (start of game)
  if (G.reward && G.reward.choices && !G.reward.guaranteed?.length) {
    openArtifactChoiceModal(G.reward);
  }

  // Bot auto-turn (skip if any modal open)
  if (
    ch &&
    ch.controller === 'bot' &&
    !G.reward &&
    !G.notice &&
    !G.winnerId
  ) {
    setTimeout(runBot, 620);
  }

  // Victory check
  checkVictory(G);
  if (G.winnerId) showVictory(G);
}