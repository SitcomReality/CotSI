import * as THREE from '../../vendor/three.module.js';
import * as sceneCtx from './sceneContext.js';
import {
  getChunkEntry, setChunkEntry, forEachChunk,
  getAllTerrainMeshes, countExploredInChunk, disposeChunk,
  chunkRebuildMode, replaceChunkFeatures
} from './chunkManager.js';
import { buildChunkTerrainMesh, buildChunkWaterMesh } from './terrain/index.js';
import { buildChunkWorldMeshes } from './worldObjects/worldMeshes.js';
import { collectUnitInstances, assembleUnitMeshes, initMovementAnimator, disposeMovementAnimator, cleanupCompleted } from './units/index.js';
import { buildChunkFeatureFx, detectCollectedFx, initFeatureFx, disposeFeatureFx } from './worldObjects/featureFx.js';
import { occupiedKeys } from './worldObjects/decorEmphasis.js';
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
import { CHUNK_REBUILD_BUDGET_MS } from '../../params/game/chunkParams.js';

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
// Signature of the unit render inputs the current meshes were built from. When
// it is unchanged the meshes are reused instead of disposed and rebuilt.
let unitSignatureCache = null;

// Chunks whose feature-only rebuild was deferred past the refresh's time
// budget. Drained by a per-frame tick; the first one commits in the refresh
// frame itself, so single-chunk moves stay visually identical.
const pendingRebuildKeys = new Set();
let lastRebuildState = null;
let lastRebuildView = null;

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

  // Deferred chunk rebuilds: drain the queue a little each frame so a burst of
  // dirty chunks never lands in a single frame.
  getClock().onTick(() => {
    if (pendingRebuildKeys.size > 0) flushChunkRebuilds(CHUNK_REBUILD_BUDGET_MS);
  });

  // Init 2D effects overlay and register layers. Three redraw tiers:
  // 'static' (fog) redraws on a quantized camera key, 'vector' (world-locked
  // movement range + path preview) on the precise camera key so outlines track
  // the terrain during a pan, 'dynamic' (animated indicators) every frame.
  initEffectsOverlay(ctx);
  registerLayer('fogOverlay', OVERLAY_Z.terrain, renderFogOverlay, 'static');
  registerLayer('movementHighlights', OVERLAY_Z.highlight, renderMovementHighlights, 'vector');
  registerLayer('pathPreview', OVERLAY_Z.pathPreview, renderPathPreview, 'vector');
  registerLayer('interactionHighlights', OVERLAY_Z.selection, renderInteractionHighlights, 'dynamic');
  registerLayer('selectionRing', OVERLAY_Z.fog, renderSelectionRing, 'dynamic');

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

  // Deferred rebuilds read these on later frames; the current call's state and
  // view are always the freshest.
  lastRebuildState = state;
  lastRebuildView = humanView;

  const { visible, explored } = humanView;
  startMeasure('renderHexMap');

  // Remove the temporary ground plane added during this session's scene setup
  ctx.removeTempGround?.();

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
      pendingRebuildKeys.delete(ck);
      disposeChunk(ck, ctx.scene);
    }
  });

  // Build new chunks, rebuild dirty chunks, and rebuild chunks whose
  // explored tile count has grown (exploration expands on vision refresh,
  // which does NOT dirty the affected chunks).
  startMeasure('mesh:chunks');
  // Occupant keys drive decoration de-emphasis and are identical for every
  // chunk in this pass — compute once instead of once per rebuilt chunk.
  const occupants = occupiedKeys(state);
  for (const [ck, chunk] of state.chunks) {
    // Outside the sight cap — nothing to build, even if explored
    if (!cullChunkKeys.has(ck)) continue;

    const entry = getChunkEntry(ck);
    const chunkTiles = [...chunk.tiles.values()];
    const exploredCount = countExploredInChunk(chunkTiles, explored);
    const mode = chunkRebuildMode(entry, chunk, exploredCount);

    if (mode === 'features') {
      // Occupancy/feature change only: terrain and water gate on `explored`,
      // which is unchanged, so only the world-object meshes need rebuilding —
      // queued for the budgeted flush below.
      pendingRebuildKeys.add(ck);
      continue;
    }
    if (mode === 'none') continue;

    // Full rebuild — new chunk, or newly explored tiles (terrain/water gate on
    // `explored`, so they must be rebuilt from scratch).
    pendingRebuildKeys.delete(ck);
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
    const features = buildChunkWorldMeshes(chunkTiles, state, visible, explored, occupants);

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
      group.updateMatrixWorld(true);
      setChunkEntry(ck, { group, terrain, water, features, exploredCount });
    }
  }
  // Commit the first queued rebuild in this refresh frame (single-chunk moves
  // stay pixel-identical); the rest drain on later frames.
  flushChunkRebuilds(CHUNK_REBUILD_BUDGET_MS, 1);
  endMeasure('mesh:chunks');

  // ── Unit meshes (global; reused while their render inputs are unchanged) ──

  // Clean up any movement-animation meshes that have completed
  cleanupCompleted();

  // Rebuild only when a unit was added/removed/moved, or the terrain under one
  // changed. The collection loop runs either way — it is where the signature
  // comes from — so reuse removes the mesh assembly, not the state walk.
  startMeasure('mesh:units');
  const collected = collectUnitInstances(state, visible);
  if (collected.signature !== unitSignatureCache) {
    for (const um of unitMeshes) sceneCtx.disposeMesh(um);
    unitMeshes = assembleUnitMeshes(collected);
    for (const um of unitMeshes) {
      ctx.scene.add(um);
      um.updateMatrixWorld(true);
    }
    unitSignatureCache = collected.signature;
  }
  endMeasure('mesh:units');

  // Scene geometry/transforms changed — refresh the (otherwise cached) shadow map.
  ctx.requestShadowUpdate?.();

  // Push current state & camera to the overlay for the next frame
  setEffectsState(state, ctx.camera);
  endMeasure('renderHexMap');
}

/**
 * Rebuild queued feature-only chunks under a time budget.
 *
 * A chunk's feature build is atomic — it cannot be split — so the budget only
 * spreads a burst of dirty chunks across frames. `minChunks` guarantees
 * progress in the refresh frame; deferred chunks keep their existing meshes
 * until their replacement is built (build-before-dispose), so nothing pops in
 * late or becomes unpickable.
 *
 * @param {number} budgetMs - Stop after this much elapsed time
 * @param {number} [minChunks=0] - Always rebuild at least this many
 */
export function flushChunkRebuilds(budgetMs, minChunks = 0) {
  const ctx = sceneCtx.getSceneContext();
  if (!ctx || pendingRebuildKeys.size === 0) return;
  const state = lastRebuildState;
  const view = lastRebuildView;
  if (!state || !view) {
    pendingRebuildKeys.clear();
    return;
  }

  const { visible, explored } = view;
  const hasLivingHuman = state.champions.some(c => c.controller === 'human' && c.alive);
  const capKeys = hasLivingHuman ? chunkKeysWithinCap(state.champions) : null;
  const occupants = occupiedKeys(state);
  const start = performance.now();
  let done = 0;

  for (const ck of [...pendingRebuildKeys]) {
    if (done >= minChunks && performance.now() - start >= budgetMs) break;
    pendingRebuildKeys.delete(ck);
    // Left the cap or no longer rendered — its entry is disposed already.
    if (capKeys && !capKeys.has(ck)) continue;
    const chunk = state.chunks.get(ck);
    const entry = getChunkEntry(ck);
    if (!chunk || !entry) continue;

    const chunkTiles = [...chunk.tiles.values()];
    const features = buildChunkWorldMeshes(chunkTiles, state, visible, explored, occupants);
    detectCollectedFx(ck, chunkTiles, visible);
    features.push(...buildChunkFeatureFx(chunkTiles, visible));
    replaceChunkFeatures(entry, features);
    if (features.length === 0 && !entry.terrain && !entry.water) disposeChunk(ck, ctx.scene);
    ctx.requestShadowUpdate?.();
    done++;
  }
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
  unitSignatureCache = null;

  pendingRebuildKeys.clear();
  lastRebuildState = null;
  lastRebuildView = null;

  disposeMovementAnimator();
  disposeFeatureFx();

  sceneCtx.disposeSceneContext();
}

// Console debug access (ES module exports aren't globals).
// Use __getSceneContext().getCameraState() to inspect camera state from the dev console.
window.__getSceneContext = sceneCtx.getSceneContext;
