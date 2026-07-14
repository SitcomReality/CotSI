import { initScene } from './scene.js';
import { buildTerrainMesh } from './terrain.js';
import { buildUnexploredMesh, buildExploredMistMesh } from './fogOfWar.js';
import { buildFeatureMeshes } from './features3d.js';
import { getHumanView } from '../../game/vision.js';
import { setupMapInteraction3D as setupInteraction } from './interaction3d.js';

let ctx = null; // singleton scene context
let terrainMesh = null;
let unexploredMesh = null;
let mistMesh = null;
let featureMeshes = [];

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
 * Full render pass — builds terrain and fog meshes from game state.
 */
export function renderHexMap3D(state) {
  if (!ctx) return;

  const humanView = getHumanView(state);

  // Dispose old meshes
  disposeMesh(terrainMesh);
  disposeMesh(unexploredMesh);
  disposeMesh(mistMesh);
  for (const fm of featureMeshes) disposeMesh(fm);
  featureMeshes = [];

  // Remove temporary ground plane if it exists
  const oldGround = ctx.scene.getObjectByName('ground');
  if (oldGround) {
    oldGround.geometry.dispose();
    ctx.scene.remove(oldGround);
  }

  // Build new terrain
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);

  // Build fog
  unexploredMesh = buildUnexploredMesh(state.tiles, humanView.explored);
  if (unexploredMesh) ctx.scene.add(unexploredMesh);

  mistMesh = buildExploredMistMesh(state.tiles, humanView.explored, humanView.visible);
  if (mistMesh) ctx.scene.add(mistMesh);

  // Build 3D features (trees, mountains, knots, bases)
  featureMeshes = buildFeatureMeshes(state, humanView.visible);
  for (const fm of featureMeshes) ctx.scene.add(fm);
}

function disposeMesh(mesh) {
  if (!mesh) return;
  // Recurse into children (handles THREE.Group, which has no .geometry)
  if (mesh.children && mesh.children.length > 0) {
    // Clone array since disposeMesh mutates the parent's children
    for (const child of [...mesh.children]) {
      disposeMesh(child);
    }
  }
  // Dispose geometry (Groups won't have one, that's fine)
  if (mesh.geometry) mesh.geometry.dispose();
  // Dispose material(s)
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  ctx.scene.remove(mesh);
}

function disposeAll() {
  disposeMesh(terrainMesh);
  disposeMesh(unexploredMesh);
  disposeMesh(mistMesh);
  for (const fm of featureMeshes) disposeMesh(fm);
  featureMeshes = [];
  // Clean up interaction listeners
  if (ctx && ctx._interactionCleanup) {
    ctx._interactionCleanup();
    delete ctx._interactionCleanup;
  }
  if (ctx) {
    ctx.dispose();
    ctx = null;
  }
}

/**
 * Wire canvas events for pan, zoom, hex picking, tooltips, and clicks.
 */
export function setupMapInteraction3D(onTileClick, getTooltipContent) {
  if (!ctx) return () => {};

  // Clean up previous interaction if any
  if (ctx._interactionCleanup) {
    ctx._interactionCleanup();
  }

  const canvas = ctx.renderer.domElement;
  const cleanup = setupInteraction(
    canvas,
    ctx.applyCamera,
    ctx.getCameraState,
    () => terrainMesh,  // getter always returns current mesh
    onTileClick,
    getTooltipContent
  );
  ctx._interactionCleanup = cleanup;
  return cleanup;
}

export function getSceneContext() {
  return ctx;
}