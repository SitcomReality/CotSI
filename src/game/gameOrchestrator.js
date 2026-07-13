/**
 * gameOrchestrator — Holds the game instance `G`, exports the central
 * conductor functions (`__beginGame`, `currentChamp`, `refreshAll`),
 * and sets window-level APIs.
 *
 * This is the coordination nexus: state → UI → render.
 */
import { createGame, checkVictory } from './state.js';
import { renderHexMapSVG, setupMapInteraction, camera, resetCamera } from '../render/hexmap.js';
import { renderLeftPanel, renderRightPanel, renderLog } from '../render/ui.js';
import { initPaleyWidget } from '../ui/paleyWidget.js';
import { setGameState, openArtifactChoiceModal } from '../ui/combatModal.js';
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

// ---- Begin game (called by setup.js) ----

export function __beginGame(config) {
  G = createGame(config);
  setGameState(G); // keep combatModal in sync

  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'grid';

  resetCamera();
  bindGameUI();
  refreshAll();
}
window.__beginGame = __beginGame;

// ---- Central render orchestrator ----

export function refreshAll() {
  if (!G) return;

  const ch = currentChamp();

  // Panels
  document.getElementById('leftMount').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightMount').innerHTML = renderRightPanel(G);

  // Map
  const mapResult = renderHexMapSVG(G, onHexClick);
  document.getElementById('mapMount').innerHTML = mapResult.svg;
  camera.offsetX = mapResult.offsetX;
  camera.offsetY = mapResult.offsetY;

  const svgEl = document.getElementById('hexMapSvg');
  if (svgEl) {
    setupMapInteraction(svgEl, onHexClick, (key) =>
      _getTooltipContent(G, key, currentChamp())
    );
  }

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