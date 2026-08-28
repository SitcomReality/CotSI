import * as THREE from '../../vendor/three.module.js';
import * as sceneCtx from './sceneContext.js';
import {
  getChunkEntry, setChunkEntry, forEachChunk,
  getAllTerrainMeshes, countExploredInChunk, disposeChunk
} from './chunkManager.js';
import { buildChunkTerrainMesh, buildChunkWaterMesh } from './terrain/index.js';
import { buildChunkWorldMeshes } from './worldObjects/worldMeshes.js';
import { buildUnitMeshes, initMovementAnimator, disposeMovementAnimator, cleanupCompleted } from './units/index.js';
import { buildChunkFeatureFx, detectCollectedFx, initFeatureFx, disposeFeatureFx } from './worldObjects/featureFx.js';
import { waterTimeUniform } from './scene/materials.js';
import { setupMapInteraction3D as setupInteraction } from './interaction/mapInteraction.js';
import { initEffectsOverlay, setEffectsState, registerLayer } from '../overlays/overlayStack.js';
import { renderFogOverlay } from '../overlays/fogOverlay.js';
import { renderSelectionRing } from '../overlays/selectionRing.js';
import { renderMovementHighlights } from '../overlays/movementHighlights.js';
import { renderPathPreview } from '../overlays/pathPreview.js';
import { renderInteractionHighlights } from '../overlays/interactionHighlights.js';
import { getClock } from '../../shared/clockScheduler.js';
import { OVERLAY_Z } from '../../params/ui/uiParams.js';
import { shadowLightConfig } from '../shadowLightConfig.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { chunkKeysWithinCap } from '../../engine/rules/sightCull.js';

// Re‑export symbols needed by external consumers
export { getSceneContext } from './sceneContext.js';
export { tileTopY, tileSurfaceY, HEX_THICKNESS } from './terrain/index.js';
export { hexCenter, hexCornersXZ, hexCenter3D } from './hexWorldSpace.js';
export { zoomCamera, fitCameraToMap } from './scene/cameraZoomMath.js';
export { setCameraStartCenter } from './scene/cameraPanMath.js';
export { centerOnHexWithFitCamera, centerOnHexWithSightZoom, centerOnHexWithFixedZoom } from './scene/cameraCentering.js';
export { animateCenterOnHex, chaseCameraToHex, cancelCameraPan } from './scene/panAnimation.js';

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

  // Water surface ripple: advance the shared shader time once per frame.
  // getClock().dispose() above cleared any prior frame callbacks, so this is
  // the only registration. One uniform write per frame drives every water mesh.
  getClock().onTick((ts) => { waterTimeUniform.value = ts / 1000; });

  // Init 2D effects overlay and register layers
  initEffectsOverlay(ctx);
  registerLayer('fogOverlay', OVERLAY_Z.terrain, renderFogOverlay);
  registerLayer('movementHighlights', OVERLAY_Z.highlight, renderMovementHighlights);
  registerLayer('pathPreview', OVERLAY_Z.pathPreview, renderPathPreview);
  registerLayer('interactionHighlights', OVERLAY_Z.selection, renderInteractionHighlights);
  registerLayer('selectionRing', OVERLAY_Z.fog, renderSelectionRing);

  // Idle unit animations deferred — setupUnitAnimations is a no-op stub.

  // Init movement animation layer — needs scene reference to add/remove meshes
  initMovementAnimator(ctx.scene);

  // Init feature FX layer (ambient accents + collect bursts)
  initFeatureFx(ctx.scene);

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

  // Remove the temporary ground plane added during this session's scene setup
  const oldGround = ctx.scene.getObjectByName('ground');
  if (oldGround) {
    oldGround.geometry.dispose();
    if (oldGround.material) oldGround.material.dispose();
    ctx.scene.remove(oldGround);
  }

  // ── Chunk-level terrain + features (incremental) ──

  // Track which chunk keys currently exist in state
  const currentChunkKeys = new Set(state.chunks.keys());

  // Sight-cap culling: only chunks intersecting the render-cap disc around a
  // living human champion may keep meshes. No humans → spectator: render all.
  const hasLivingHuman = state.champions.some(c => c.controller === 'human' && c.alive);
  const cullChunkKeys = hasLivingHuman ? chunkKeysWithinCap(state.champions) : currentChunkKeys;

  // Dispose chunk entries that no longer exist in state OR have left the
  // sight cap (the champion moved away) — their geometry is never visible.
  forEachChunk((ck) => {
    if (!currentChunkKeys.has(ck) || !cullChunkKeys.has(ck)) {
      disposeChunk(ck, ctx.scene);
    }
  });

  // Build new chunks, rebuild dirty chunks, and rebuild chunks whose
  // explored tile count has grown (exploration expands on vision refresh,
  // which does NOT dirty the affected chunks).
  startMeasure('mesh:chunks');
  for (const [ck, chunk] of state.chunks) {
    // Outside the sight cap — nothing to build, even if explored
    if (!cullChunkKeys.has(ck)) continue;

    const entry = getChunkEntry(ck);
    const chunkTiles = [...chunk.tiles.values()];
    const exploredCount = countExploredInChunk(chunkTiles, explored);

    if (chunk.dirty || !entry || exploredCount !== entry.exploredCount) {
      // Dispose old if it exists (dirty or exploration-change rebuild)
      if (entry) disposeChunk(ck, ctx.scene);

      if (chunkTiles.length === 0) continue;

      // Build terrain mesh for this chunk
      const terrain = buildChunkTerrainMesh(chunkTiles, state, visible, explored);

      // Build water mesh for this chunk (water renders on its own material;
      // sun glints are a shader term inside that material, no extra meshes)
      const water = buildChunkWaterMesh(chunkTiles, state, visible, explored);

      // Build world-object meshes for this chunk. `explored` lets terrain
      // decorations (mountain, hill mound, grove) render on explored tiles
      // that are out of sight — features, bases, and units stay visible-gated.
      const features = buildChunkWorldMeshes(chunkTiles, state, visible, explored);

      // Fire collect bursts for knots/chests that vanished since the last
      // build (diffed against this module's per-chunk snapshot), then build
      // the ambient feature-FX accents. Both are disposed with the chunk.
      detectCollectedFx(ck, chunkTiles, visible);
      const featureFx = buildChunkFeatureFx(chunkTiles, visible);

      if (terrain || water || features.length > 0 || featureFx.length > 0) {
        const group = new THREE.Group();
        group.name = `chunk-${ck}`;
        if (terrain) {
          terrain.name = `terrain-${ck}`;
          group.add(terrain);
        }
        if (water) {
          water.name = `water-${ck}`;
          group.add(water);
        }
        features.push(...featureFx);
        for (const fm of features) {
          group.add(fm);
        }
        ctx.scene.add(group);
        setChunkEntry(ck, { group, terrain, water, features, exploredCount });
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
  disposeFeatureFx();

  sceneCtx.disposeSceneContext();
}

// Console debug access (ES module exports aren't globals).
// Use __getSceneContext().getCameraState() to inspect camera state from the dev console.
window.__getSceneContext = sceneCtx.getSceneContext;
