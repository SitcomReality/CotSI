import * as THREE from '../../vendor/three.module.js';
import { initScene } from './scene/sceneSetup.js';
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

// Re‑export symbols needed by external consumers
export { tileTopY, HEX_THICKNESS } from './terrain/terrainMesh.js';
export { hexCenter, hexCornersXZ, hexCenter3D } from './hexWorldSpace.js';
export { resetCamera, zoomCamera, fitCameraToMap } from './scene/cameraZoomMath.js';
export { setPanBounds, setCameraStartCenter } from './scene/cameraPanMath.js';
export { centerCameraOnHex, centerOnHexWithFitCamera, centerOnHexWithSightZoom, centerOnHexWithFixedZoom } from './scene/cameraCentering.js';
export { animateCenterOnHex, cancelCameraPan } from './scene/panAnimation.js';

let ctx = null; // singleton scene context

// Chunk-managed meshes: Map<chunkKey, { group: THREE.Group, terrain: THREE.Mesh, features: (InstancedMesh|Group)[], exploredCount: number }>
const chunkMeshes = new Map();
// Global unit meshes (units are few, not worth chunking yet)
let unitMeshes = [];

/** Return all chunk terrain meshes as an array (for raycasting). */
function allTerrainMeshes() {
  const arr = [];
  for (const [, entry] of chunkMeshes) {
    if (entry.terrain) arr.push(entry.terrain);
  }
  return arr;
}

/** Count how many tiles in a tile array are in the explored set. */
function countExploredInChunk(chunkTiles, explored) {
  let count = 0;
  for (const tile of chunkTiles) {
    if (explored.has(`${tile.q},${tile.r}`)) count++;
  }
  return count;
}

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
  if (!ctx) return;

  const { visible, explored } = humanView;

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
  for (const [ck] of chunkMeshes) {
    if (!currentChunkKeys.has(ck)) {
      disposeChunk(ck);
    }
  }

  // Build new chunks, rebuild dirty chunks, and rebuild chunks whose
  // explored tile count has grown (exploration expands on vision refresh,
  // which does NOT dirty the affected chunks).
  for (const [ck, chunk] of state.chunks) {
    const entry = chunkMeshes.get(ck);
    const chunkTiles = [...chunk.tiles.values()];
    const exploredCount = countExploredInChunk(chunkTiles, explored);

    if (chunk.dirty || !entry || exploredCount !== entry.exploredCount) {
      // Dispose old if it exists (dirty or exploration-change rebuild)
      if (entry) disposeChunk(ck);

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
        chunkMeshes.set(ck, { group, terrain, features, exploredCount });
      }
    }
  }
      }
    }
  }

  // ── Unit meshes (global, rebuilt each frame — cheap for ~20 units) ──

  // Clean up any movement-animation meshes that have completed
  cleanupCompleted();

  // Dispose old unit meshes
  for (const um of unitMeshes) disposeMesh(um);
  unitMeshes = [];

  // Build unit figurines
  unitMeshes = buildUnitMeshes(state, visible);
  for (const um of unitMeshes) ctx.scene.add(um);

  // Push current state & camera to the overlay for the next frame
  setEffectsState(state, ctx.camera);
}

/**
 * Dispose all meshes belonging to a chunk and remove from tracking Map.
 */
function disposeChunk(ck) {
  const entry = chunkMeshes.get(ck);
  if (!entry) return;

  // Dispose terrain
  disposeMeshRecursive(entry.terrain);

  // Dispose feature meshes (may include THREE.Group with children)
  for (const fm of entry.features) {
    disposeMeshRecursive(fm);
  }

  // Remove group from scene
  if (entry.group) ctx.scene.remove(entry.group);

  chunkMeshes.delete(ck);
}

/**
 * Recursively dispose geometry and material of a mesh and its children.
 * Does NOT remove from scene (caller handles scene removal).
 */
function disposeMeshRecursive(obj) {
  if (!obj) return;
  // Recurse into children first
  if (obj.children && obj.children.length > 0) {
    for (const child of [...obj.children]) {
      disposeMeshRecursive(child);
    }
  }
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose());
    } else {
      obj.material.dispose();
    }
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
    allTerrainMeshes,  // returns array of all chunk terrain meshes for raycasting
    onTileClick,
    getTooltipContent,
    onZoomChange
  );
  ctx._interactionCleanup = cleanup;
  return cleanup;
}

/**
 * Dispose a single mesh (geometry + material) and remove from scene.
 * For unit meshes (Groups/InstancedMeshes with no sub-children to recurse into).
 */
function disposeMesh(mesh) {
  if (!mesh) return;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  ctx.scene.remove(mesh);
}

/**
 * Full cleanup — dispose all chunk meshes, unit meshes, animator, and scene.
 */
function disposeAll() {
  for (const [ck] of chunkMeshes) {
    disposeChunk(ck);
  }
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

export function getSceneContext() {
  return ctx;
}

// Console debug access (ES module exports aren't globals).
// Use __getSceneContext().getCameraState() to inspect camera state from the dev console.
window.__getSceneContext = getSceneContext;