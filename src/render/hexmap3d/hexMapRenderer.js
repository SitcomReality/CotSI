import { initScene } from './scene/sceneSetup.js';
import { buildTerrainMesh } from './terrain/terrainMesh.js';

import { buildFeatureMeshes } from './features/featureMeshes.js';
import { buildUnitMeshes, setupUnitAnimations, initMovementAnimator, disposeMovementAnimator, cleanupCompleted, initPieceTextures, disposePieceTextures } from './units/index.js';
import { setupMapInteraction3D as setupInteraction } from './interaction/mapInteraction.js';
import { initEffectsOverlay, setEffectsState, registerLayer } from '../overlays/overlayStack.js';
import { renderFogOverlay } from '../overlays/fogOverlay.js';
import { renderSelectionRing } from '../overlays/selectionRing.js';
import { renderMovementHighlights } from '../overlays/movementHighlights.js';
import { getClock } from '../../shared/clockScheduler.js';
import { shadowLightConfig } from '../shadowLightConfig.js';

// Re‑export symbols needed by external consumers
export { tileTopY, HEX_THICKNESS } from './terrain/terrainMesh.js';
export { hexCenter, hexCornersXZ, hexCenter3D } from './hexWorldSpace.js';
export { resetCamera, zoomCamera, fitCameraToMap } from './scene/cameraZoomMath.js';
export { setPanBounds } from './scene/cameraPanMath.js';
export { centerCameraOnHex, centerOnHexWithFitCamera, centerOnHexWithSightZoom, centerOnHexWithFixedZoom } from './scene/cameraCentering.js';
export { animateCenterOnHex, cancelCameraPan } from './scene/panAnimation.js';

let ctx = null; // singleton scene context
let terrainMesh = null;
let featureMeshes = [];
let unitMeshes = [];

/**
 * One-time initialization. Called from runtime/mapRefresh.js on first refreshAll.
 */
export function initHexMap3D(mountElement) {
  if (ctx) {
    disposeAll();
    // Clear all clock tasks and frame callbacks from the previous game
    getClock().dispose();
  }
  ctx = initScene(mountElement, { clock: getClock(), shadows: shadowLightConfig.enabled });

  // Start the clock's rAF loop (safe to call multiple times)
  getClock().start();

  // Init 2D effects overlay and register layers
  initEffectsOverlay(ctx);
  registerLayer('fogOverlay', 0, renderFogOverlay);
  registerLayer('movementHighlights', 5, renderMovementHighlights);
  registerLayer('selectionRing', 10, renderSelectionRing);

  // Setup animations (needs game state access)
  setupUnitAnimations(ctx, () => window.__gameState);

  // Init movement animation layer — needs scene reference to add/remove meshes
  initMovementAnimator(ctx.scene);

  // Pre-generate mob/trader piece icon textures (synchronous, cached)
  initPieceTextures();

  return ctx;
}

/**
 * Full render pass — builds terrain, features, and unit meshes from game state.
 * @param {Object} state - Game state
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView - Pre-computed fog-of-war view
 */
export function renderHexMap3D(state, humanView) {
  if (!ctx) return;

  // Dispose old meshes
  disposeMesh(terrainMesh);
  for (const fm of featureMeshes) disposeMesh(fm);
  featureMeshes = [];
  for (const um of unitMeshes) disposeMesh(um);
  unitMeshes = [];

  // Remove temporary ground plane if it exists
  const oldGround = ctx.scene.getObjectByName('ground');
  if (oldGround) {
    oldGround.geometry.dispose();
    if (oldGround.material) oldGround.material.dispose();
    ctx.scene.remove(oldGround);
  }

  // Build new terrain
  terrainMesh = buildTerrainMesh(state, humanView.visible, humanView.explored);
  ctx.scene.add(terrainMesh);

  // Build 3D features (trees, mountains, knots, bases)
  featureMeshes = buildFeatureMeshes(state, humanView.visible);
  for (const fm of featureMeshes) ctx.scene.add(fm);

  // Clean up any movement-animation meshes that have completed so the
  // champion transitions seamlessly from temp mesh → normal InstancedMesh.
  cleanupCompleted();

  // Build unit figurines
  unitMeshes = buildUnitMeshes(state, humanView.visible);
  for (const um of unitMeshes) ctx.scene.add(um);

  // Push current state & camera to the overlay for the next frame
  setEffectsState(state, ctx.camera);
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
  for (const fm of featureMeshes) disposeMesh(fm);
  featureMeshes = [];
  for (const um of unitMeshes) disposeMesh(um);
  unitMeshes = [];
  disposeMovementAnimator();
  disposePieceTextures();
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
 * @param {function} onTileClick - Callback when a hex is clicked
 * @param {function} getTooltipContent - (key) => content for hex hover tooltip
 * @param {function} [onZoomChange] - Optional callback fired after camera zoom changes
 */
export function setupMapInteraction3D(onTileClick, getTooltipContent, onZoomChange) {
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
    getTooltipContent,
    onZoomChange
  );
  ctx._interactionCleanup = cleanup;
  return cleanup;
}

export function getSceneContext() {
  return ctx;
}