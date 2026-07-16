import { createGame } from './gameFactory.js';
import { checkVictory } from './victory.js';
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext } from '../render/hexmap3d/hexmap3d-index.js';
import { syncSize } from '../render/effects/effectsOverlay.js';
import { resetCamera as resetCamera3D, centerCameraOnHex } from '../render/hexmap3d/hexmap3d-index.js';
import { renderLeftPanel, renderRightPanel, renderLog } from '../render/panels/panels-index.js';
import { renderHeader, bindHeaderEvents } from '../ui/headerRenderer.js';
import { initPaleyWidget } from '../ui/paleyWidget.js';
import { setGameState, openArtifactChoiceModal } from '../ui/combat/combatui-index.js';
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

// Track which champion we last centered the camera on (by id,
// so we only center once when a human champion's turn starts)
let lastCenteredChampionId = null;

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
  bindHeaderEvents();
  refreshAll();
}
window.__beginGame = __beginGame;

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) return;

  window.__gameState = G;

  const ch = currentChamp();

  // ── Header ──
  const { world, champions } = renderHeader(G);
  const headerWorldEl = document.querySelector('#gameHeader .header__world');
  const headerChampsEl = document.querySelector('#gameHeader .header__champions');
  if (headerWorldEl) headerWorldEl.innerHTML = world;
  if (headerChampsEl) headerChampsEl.innerHTML = champions;

  // Panels
  document.getElementById('leftPanel').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightPanel').innerHTML = renderRightPanel(G);

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

  // ── Center camera on human champion at turn start ──
  if (ch && ch.controller === 'human' && ch.id !== lastCenteredChampionId) {
    const ctx3d = getSceneContext();
    if (ctx3d) {
      centerCameraOnHex(ctx3d.getCameraState(), ch.pos.q, ch.pos.r);
      ctx3d.applyCamera();
    }
    lastCenteredChampionId = ch.id;
  }

  // Paley widget
  initPaleyWidget('paleyMount');

  // Log
  document.getElementById('logMount').innerHTML = renderLog(G);

  // HUD
  if (ch) {
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