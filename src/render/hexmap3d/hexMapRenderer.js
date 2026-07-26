import * as THREE from '../../vendor/three.module.js';
import * as sceneCtx from './sceneContext.js';
import {
  getChunkEntry, setChunkEntry, forEachChunk,
  getAllTerrainMeshes, countExploredInChunk, disposeChunk
} from './chunkManager.js';
import { buildChunkTerrainMesh } from './terrain/terrainMesh.js';
import { buildChunkFeatureMeshes } from './features/featureMeshes.js';
import { buildUnitMeshes, setupUnitAnimations, initMovementAnimator, disposeMovementAnimator, cleanupCompleted, initPieceTextures, disposePieceTextures } from './units/index.js';
import { setupMapInteraction3D as setupInteraction } from './interaction/mapInteraction.js';
import { initEffectsOverlay, setEffectsState, registerLayer } from '../overlays/overlayStack.js';
import { renderFogOverlay } from '../overlays/fogOverlay.js';
import { renderSelectionRing } from '../overlays/selectionRing.js';
import { renderMovementHighlights } from '../overlays/movementHighlights.js';
import { renderInteractionHighlights } from '../overlays/interactionHighlights.js';
import { getClock } from '../../shared/clockScheduler.js';
import { shadowLightConfig } from '../shadowLightConfig.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';

// Re‑export symbols needed by external consumers
export { getSceneContext } from './sceneContext.js';
export { tileTopY, HEX_THICKNESS } from './terrain/terrainMesh.js';
export { hexCenter, hexCornersXZ, hexCenter3D } from './hexWorldSpace.js';
export { resetCamera, zoomCamera, fitCameraToMap } from './scene/cameraZoomMath.js';
export { setPanBounds, setCameraStartCenter } from './scene/cameraPanMath.js';
export { centerCameraOnHex, centerOnHexWithFitCamera, centerOnHexWithSightZoom, centerOnHexWithFixedZoom } from './scene/cameraCentering.js';
export { animateCenterOnHex, cancelCameraPan } from './scene/panAnimation.js';

// Global unit meshes (units are few, not worth chunking yet)
let unitMeshes = [];

/**
 * One-time initialization. Called from runtime/mapRefresh.js on first refreshAll.
 * @param {Element} mountElement - DOM element to mount the Three.js canvas
 * @returns {Object} The initialized scene context
 */
export function initHexMap3D(mountElement) {
  if (sceneCtx.getSceneContext()) {
    disposeAll();
    // Clear all clock tasks and frame callbacks from the previous game
    getClock().dispose();
  }

  const ctx = sceneCtx.initSceneContext(mountElement, { clock: getClock(), shadows: shadowLightConfig.enabled });

  // Start the clock's rAF loop (safe to call multiple times)
  getClock().start();

  // Init 2D effects overlay and register layers
  initEffectsOverlay(ctx);
  registerLayer('fogOverlay', 0, renderFogOverlay);
  registerLayer('movementHighlights', 5, renderMovementHighlights);
  registerLayer('interactionHighlights', 7, renderInteractionHighlights);
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
 * Uses chunk-aware incremental rebuild: only dirty chunks are rebuilt.
 * @param {Object} state - Game state (with state.chunks Map)
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView - Pre-computed fog-of-war view
 */
export function renderHexMap3D(state, humanView) {
  const ctx = sceneCtx.getSceneContext();
  if (!ctx) return;

  const { visible, explored } = humanView;
  startMeasure('renderHexMap');

  // Remove old ground plane if it exists (one-time cleanup from older sessions)
  const oldGround = ctx.scene.getObjectByName('ground');
  if (oldGround) {
    oldGround.geometry.dispose();
    if (oldGround.material) oldGround.material.dispose();
    ctx.scene.remove(oldGround);
  }

  // ── Chunk-level terrain + features (incremental) ──

  // Track which chunk keys currently exist in state
  const currentChunkKeys = new Set(state.chunks.keys());

  // Dispose chunks that no longer exist in state
  forEachChunk((ck) => {
    if (!currentChunkKeys.has(ck)) {
      disposeChunk(ck, ctx.scene);
    }
  });

  // Build new chunks, rebuild dirty chunks, and rebuild chunks whose
  // explored tile count has grown (exploration expands on vision refresh,
  // which does NOT dirty the affected chunks).
  startMeasure('mesh:chunks');
  for (const [ck, chunk] of state.chunks) {
    const entry = getChunkEntry(ck);
    const chunkTiles = [...chunk.tiles.values()];
    const exploredCount = countExploredInChunk(chunkTiles, explored);

    if (chunk.dirty || !entry || exploredCount !== entry.exploredCount) {
      // Dispose old if it exists (dirty or exploration-change rebuild)
      if (entry) disposeChunk(ck, ctx.scene);

      if (chunkTiles.length === 0) continue;

      // Build terrain mesh for this chunk
      const terrain = buildChunkTerrainMesh(chunkTiles, state, visible, explored);

      // Build feature meshes for this chunk
      const features = buildChunkFeatureMeshes(chunkTiles, state, visible);

      if (terrain || features.length > 0) {
        const group = new THREE.Group();
        group.name = `chunk-${ck}`;
        if (terrain) {
          terrain.name = `terrain-${ck}`;
          group.add(terrain);
        }
        for (const fm of features) {
          group.add(fm);
        }
        ctx.scene.add(group);
        setChunkEntry(ck, { group, terrain, features, exploredCount });
      }
    }
  }
  endMeasure('mesh:chunks');

  // ── Unit meshes (global, rebuilt each frame — cheap for ~20 units) ──

  // Clean up any movement-animation meshes that have completed
  cleanupCompleted();

  // Dispose old unit meshes
  startMeasure('mesh:units');
  for (const um of unitMeshes) sceneCtx.disposeMesh(um);
  unitMeshes = [];

  // Build unit figurines
  unitMeshes = buildUnitMeshes(state, visible);
  for (const um of unitMeshes) ctx.scene.add(um);
  endMeasure('mesh:units');

  // Push current state & camera to the overlay for the next frame
  setEffectsState(state, ctx.camera);
  endMeasure('renderHexMap');
}

/**
 * Wire canvas events for pan, zoom, hex picking, tooltips, and clicks.
 * @param {function} onTileClick - Callback when a hex is clicked
 * @param {function} getTooltipContent - (key) => content for hex hover tooltip
 * @param {function} [onZoomChange] - Optional callback fired after camera zoom changes
 * @returns {function} Cleanup function
 */
export function setupMapInteraction3D(onTileClick, getTooltipContent, onZoomChange) {
  const ctx = sceneCtx.getSceneContext();
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
    getAllTerrainMeshes,  // returns array of all chunk terrain meshes for raycasting
    onTileClick,
    getTooltipContent,
    onZoomChange
  );
  ctx._interactionCleanup = cleanup;
  return cleanup;
}

/**
 * Full cleanup — dispose all chunk meshes, unit meshes, animator, and scene.
 */
function disposeAll() {
  const ctx = sceneCtx.getSceneContext();
  if (ctx) {
    forEachChunk((ck) => disposeChunk(ck, ctx.scene));
  }

  for (const um of unitMeshes) sceneCtx.disposeMesh(um);
  unitMeshes = [];

  disposeMovementAnimator();
  disposePieceTextures();

  sceneCtx.disposeSceneContext();
}

// Console debug access (ES module exports aren't globals).
// Use __getSceneContext().getCameraState() to inspect camera state from the dev console.
window.__getSceneContext = sceneCtx.getSceneContext;
