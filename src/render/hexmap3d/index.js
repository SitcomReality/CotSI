import { initScene } from './scene.js';
import { buildTerrainMesh } from './terrain.js';
import { getHumanView } from '../../game/vision.js';

let ctx = null; // singleton scene context
let terrainMesh = null; // track for disposal/replacement

/**
 * One-time initialization. Called from gameOrchestrator on first refreshAll.
 */
export function initHexMap3D(mountElement) {
  if (ctx) {
    disposeAll();
  }
  ctx = initScene(mountElement);
  return ctx;
}

/**
 * Full render pass — builds terrain mesh from game state.
 */
export function renderHexMap3D(state) {
  if (!ctx) return;

  const humanView = getHumanView(state);

  // Dispose old terrain
  if (terrainMesh) {
    terrainMesh.geometry.dispose();
    ctx.scene.remove(terrainMesh);
    terrainMesh = null;
  }

  // Remove temporary ground plane if it exists
  const oldGround = ctx.scene.getObjectByName('ground');
  if (oldGround) {
    oldGround.geometry.dispose();
    ctx.scene.remove(oldGround);
  }

  // Build new terrain
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);
}

function disposeAll() {
  if (terrainMesh) {
    terrainMesh.geometry.dispose();
    terrainMesh = null;
  }
  if (ctx) {
    ctx.dispose();
    ctx = null;
  }
}

/**
 * Placeholder — Phase 3 will implement real interaction.
 */
export function setupMapInteraction3D(onTileClick, getTooltipContent) {
  if (!ctx) return () => {};
  // Phase 3: wire canvas events + raycaster
  return () => {};
}

export function getSceneContext() {
  return ctx;
}