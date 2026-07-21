/**
 * movementAnimator.js — Champion movement animation state machine.
 *
 * Manages temporary body+head meshes that animate a champion moving between
 * hex tiles.  Pure animation math (curves, interpolation, frame transforms)
 * lives in movementCurves.js — this file handles:
 *   - Module state (scene ref, active/completed animation maps)
 *   - rAF integration via the clock scheduler
 *   - Mesh creation, scene add/remove, and material disposal
 *
 * Rapid successive moves are smoothly interpolated: if a new movement starts
 * while a previous one is in flight, the current interpolated position becomes
 * the origin of the new animation so the champion appears to "bob" between hexes.
 *
 * Layer: render/ — imports render/ units/geometries + curves, shared/ clock, vendor/ Three.
 */

import * as THREE from '../../../vendor/three.module.js';
import { getClock } from '../../../shared/clockScheduler.js';
import { getChampionBodyGeo, getChampionHeadGeo } from './unitGeometries.js';
import {
  hexToRgb,
  computeInterpolatedPos,
  applyAnimationFrame,
} from './movementCurves.js';

// Re-exported so existing callers importing MOVE_DURATION from this module
// don't need to update their import paths.
export { MOVE_DURATION } from './movementCurves.js';

// ─── Module state ────────────────────────────────────────────────────────────

/** Reference to the Three.js scene, set once by hexMapRenderer. */
let scene = null;

/** Map of championId → active animation state. */
const activeAnimations = new Map();

/** Set of animations that have completed but whose meshes are still in the
 *  scene.  Cleaned up on the next renderHexMap3D pass. */
const completedAnimations = new Set();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Store the Three.js scene reference so the animator can add/remove meshes.
 * Called once during hexMapRenderer init.
 * @param {THREE.Scene} threeScene
 */
export function initMovementAnimator(threeScene) {
  scene = threeScene;
}

/**
 * Whether a champion currently has an in-flight movement animation.
 * Used by buildUnitMeshes to skip rendering that champion in the normal mesh.
 * @param {string} championId
 * @returns {boolean}
 */
export function isAnimating(championId) {
  return activeAnimations.has(championId);
}

/**
 * All champion IDs that are currently animating.
 * @returns {Set<string>}
 */
export function getAnimatingIds() {
  return new Set(activeAnimations.keys());
}

/**
 * Start (or smoothly transition) a champion movement animation.
 *
 * If an animation for this champion is already in flight, its current
 * interpolated world position is snapped and used as the origin for the
 * new animation.  This produces the "bobbing" look on rapid clicks.
 *
 * @param {string} championId
 * @param {{x:number,y:number,z:number}} fromPos — world-space origin
 * @param {{x:number,y:number,z:number}} toPos   — world-space destination
 * @param {string} factionColorHex               — CSS hex colour for the body
 * @param {number} [duration=250]                — animation duration in ms
 * @param {Function} [onComplete]                — called when animation naturally finishes
 */
export function queueOrStart(championId, fromPos, toPos, factionColorHex, duration = 250, onComplete = null) {
  if (!scene) return;

  const existing = activeAnimations.get(championId);
  let actualFromX, actualFromY, actualFromZ;

  if (existing) {
    // Snapshot the current interpolated position of the in-flight animation.
    const elapsed = performance.now() - existing.startTime;
    const t = Math.min(elapsed / existing.duration, 1);
    const snap = computeInterpolatedPos(existing, t);
    actualFromX = snap.x;
    actualFromY = snap.y;
    actualFromZ = snap.z;
    console.debug(
      `[move] interrupted at t=%.2f  snap=(%.3f,%.3f,%.3f) → new target=(%.3f,%.3f,%.3f)`,
      t, snap.x, snap.y, snap.z, toPos.x, toPos.y, toPos.z
    );
    _removeAnimation(championId, existing);
  } else {
    // Remove any completed-but-not-yet-cleaned-up animation for this champion
    // so we don't have a stale mesh sitting at the old position.
    for (const comp of completedAnimations) {
      if (comp.championId === championId) {
        _disposeCompleted(comp);
        completedAnimations.delete(comp);
        break;
      }
    }
    actualFromX = fromPos.x;
    actualFromY = fromPos.y;
    actualFromZ = fromPos.z;
    console.debug(
      `[move] start  from=(%.3f,%.3f,%.3f) → to=(%.3f,%.3f,%.3f)`,
      fromPos.x, fromPos.y, fromPos.z, toPos.x, toPos.y, toPos.z
    );
  }

  // Build temporary meshes
  const rgb = hexToRgb(factionColorHex);
  const bodyMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color(rgb[0], rgb[1], rgb[2]),
    flatShading: true,
  });
  const headMat = new THREE.MeshLambertMaterial({
    color: 0xffe8c8,
    flatShading: true,
  });

  const body = new THREE.Mesh(getChampionBodyGeo(), bodyMat);
  const head = new THREE.Mesh(getChampionHeadGeo(), headMat);

  scene.add(body);
  scene.add(head);

  const startTime = performance.now();

  const anim = {
    championId,
    body,
    head,
    bodyMat,
    headMat,
    fromX: actualFromX, fromY: actualFromY, fromZ: actualFromZ,
    toX: toPos.x, toY: toPos.y, toZ: toPos.z,
    startTime,
    duration,
    onComplete,
    stopFn: null,
  };

  anim.stopFn = getClock().onTick((timestamp) => {
    const elapsed = timestamp - startTime;
    const t = Math.max(0, Math.min(elapsed / duration, 1));

    applyAnimationFrame(anim, t);

    if (t >= 1) {
      // Animation finished: keep the mesh at its final position in the scene
      // so the champion remains visible.  Mark as completed; the next
      // renderHexMap3D pass will clean it up after building the normal mesh.
      if (anim.stopFn) {
        anim.stopFn();
        anim.stopFn = null;
      }
      activeAnimations.delete(championId);
      completedAnimations.add(anim);
      if (anim.onComplete) anim.onComplete();
    }
  });

  activeAnimations.set(championId, anim);
}

/**
 * Remove all completed-but-still-visible animation meshes from the scene.
 * Called by renderHexMap3D before building the normal unit meshes so the
 * champion seamlessly transitions from temp mesh → normal InstancedMesh
 * without any gap or double-rendering.
 */
export function cleanupCompleted() {
  for (const anim of completedAnimations) {
    _disposeCompleted(anim);
  }
  completedAnimations.clear();
}

/**
 * Cancel all in-flight animations, dispose their meshes, and clear
 * completed animations.  Called on game restart / scene teardown.
 */
export function disposeAll() {
  for (const [id, anim] of activeAnimations) {
    _removeAnimation(id, anim);
  }
  activeAnimations.clear();
  for (const anim of completedAnimations) {
    _disposeCompleted(anim);
  }
  completedAnimations.clear();
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _removeAnimation(championId, anim) {
  if (anim.stopFn) {
    anim.stopFn();
    anim.stopFn = null;
  }
  if (anim.body && scene) scene.remove(anim.body);
  if (anim.head && scene) scene.remove(anim.head);
  // Dispose only the materials — geometries are shared via the geometry cache.
  if (anim.bodyMat) anim.bodyMat.dispose();
  if (anim.headMat) anim.headMat.dispose();
  activeAnimations.delete(championId);
}

/** Dispose a completed animation's meshes and materials. */
function _disposeCompleted(anim) {
  if (anim.body && scene) scene.remove(anim.body);
  if (anim.head && scene) scene.remove(anim.head);
  if (anim.bodyMat) anim.bodyMat.dispose();
  if (anim.headMat) anim.headMat.dispose();
}
