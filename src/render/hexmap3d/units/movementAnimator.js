/**
 * movementAnimator.js — Champion movement animation state machine.
 *
 * Manages a temporary miniature mesh that animates a champion moving between
 * hex tiles.  Pure animation math (curves, interpolation, frame transforms)
 * lives in movementCurves.js — this file handles:
 *   - Module state (scene ref, active/completed animation maps)
 *   - rAF integration via the clock scheduler
 *   - Mesh creation, scene add/remove, and material disposal
 *
 * The animated piece is the champion's ACTUAL descriptor miniature — same
 * parts, geometries, materials and transforms as the static render — with all
 * parts parented to one THREE.Group. The group glides/lifts/tilts as a unit,
 * so the Forge Juggernaut you see moving is the Forge Juggernaut you see
 * standing. Geometries/materials are the shared shapeFactory/outline caches,
 * so nothing here is disposed — the group is simply removed on cleanup.
 *
 * Rapid successive moves are smoothly interpolated: if a new movement starts
 * while a previous one is in flight, the current interpolated position becomes
 * the origin of the new animation so the champion appears to "bob" between hexes.
 *
 * Layer: render/ — imports render/ descriptor pipeline + curves, shared/ clock, vendor/ Three.
 */

import * as THREE from '../../../vendor/three.module.js';
import { getClock } from '../../../shared/clockScheduler.js';
import { startMeasure, endMeasure } from '../../../shared/measurements.js';
import { normalizeDescriptor } from '../worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../worldObjects/descriptors/meshAssembly.js';
import { addOutlines } from '../scene/outline.js';
import { CHAMPION_DESCRIPTOR } from '../worldObjects/descriptors/data/champion.js';
import {
  computeInterpolatedPos,
  applyAnimationFrame,
} from './movementCurves.js';
import { MOVE_ANIM_DURATION } from '../../../params/render/animationParams.js';

// Re-exported so existing callers importing MOVE_DURATION from this module
// don't need to update their import paths.
export { MOVE_DURATION } from './movementCurves.js';

// The animating miniature is built through the same descriptor pipeline the
// static unit meshes use (unitMeshes.js) — one geometry/material source,
// shared via the shapeFactories + outline caches. Records are generated at the
// group origin (0,0,0); the group transform then drives the whole piece.
const normalizedChampion = normalizeDescriptor(CHAMPION_DESCRIPTOR);

/** Faction entry → the entity shape recordsForEntity expects (token colors). */
function championEntityFor(faction) {
  return {
    faction: faction.short,
    colors: {
      factionBase: parseInt(faction.base.slice(1), 16),
      factionAccent: parseInt(faction.color.slice(1), 16),
    },
  };
}

// ─── Module state ────────────────────────────────────────────────────────────

/** Reference to the Three.js scene, set once by hexMapRenderer. */
let scene = null;

/** Map of championId → active animation state. */
const activeAnimations = new Map();

/** Set of animations that have completed but whose meshes are still in the
 *  scene.  Cleaned up on the next renderHexMap3D pass. */
const completedAnimations = new Set();

/**
 * Pending multi-hop chains: championId → { hops, faction, duration, index, onComplete }.
 * Each hop starts when the previous one finishes (see queuePath).
 */
const pendingPaths = new Map();

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
 * @param {object} faction                        — FACTIONS entry (short/base/color
 *        resolve the champion variant and its factionBase/factionAccent tokens)
 * @param {number} [duration=MOVE_ANIM_DURATION] — animation duration in ms
 * @param {Function} [onComplete]                — called when animation naturally finishes
 */
export function queueOrStart(championId, fromPos, toPos, faction, duration = MOVE_ANIM_DURATION, onComplete = null) {
  if (!scene) return;

  // A direct animation is a new intent: drop any pending multi-hop chain.
  pendingPaths.delete(championId);

  _startHop(championId, fromPos, toPos, faction, duration, onComplete);
}

/** Start the next hop of a champion's pending chain, if any. */
function _startNextHop(championId) {
  const chain = pendingPaths.get(championId);
  if (!chain) return;
  if (chain.index >= chain.hops.length) {
    pendingPaths.delete(championId);
    if (chain.onComplete) chain.onComplete();
    return;
  }
  const hop = chain.hops[chain.index++];
  _startHop(championId, hop.from, hop.to, chain.faction, chain.duration, () => {
    if (pendingPaths.get(championId) === chain) _startNextHop(championId);
  });
}

/** Core hop animation (shared by queueOrStart and queuePath chains). */
function _startHop(championId, fromPos, toPos, faction, duration, onComplete) {
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
  }

  // Build the champion's real miniature: descriptor records at the group
  // origin, one InstancedMesh per part (outline hulls attached), all parented
  // to a single group so the animation transform drives the whole piece.
  const records = recordsForEntity(normalizedChampion, championEntityFor(faction), { x: 0, y: 0, z: 0 });
  const group = new THREE.Group();
  group.name = `anim-${faction.short}`;
  for (const mesh of buildDescriptorMeshes(normalizedChampion, records, group.name)) {
    group.add(...addOutlines(mesh));
  }
  scene.add(group);

  const startTime = performance.now();

  const anim = {
    championId,
    group,
    fromX: actualFromX, fromY: actualFromY, fromZ: actualFromZ,
    toX: toPos.x, toY: toPos.y, toZ: toPos.z,
    startTime,
    duration,
    onComplete,
    stopFn: null,
  };

  anim.stopFn = getClock().onTick((timestamp) => {
    startMeasure('animMove');
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
    endMeasure('animMove');
  });

  activeAnimations.set(championId, anim);
}

/**
 * Animate a multi-hop movement path as a sequential chain of hops.
 * Each hop runs for `duration` ms; the next hop starts when the previous
 * one finishes, so the champion visibly walks hex by hex. Interrupting with
 * a new queueOrStart/queuePath cancels the rest of the chain.
 *
 * @param {string} championId
 * @param {Array<{from:{x,y,z}, to:{x,y,z}}>} hops — world-space hop pairs
 * @param {object} faction
 * @param {number} [duration=MOVE_ANIM_DURATION]
 * @param {Function} [onComplete] — called when the last hop finishes
 */
export function queuePath(championId, hops, faction, duration = MOVE_ANIM_DURATION, onComplete = null) {
  if (!scene) {
    if (onComplete) onComplete();
    return;
  }
  if (!hops.length) {
    if (onComplete) onComplete();
    return;
  }
  const chain = { hops, faction, duration, index: 0, onComplete };
  pendingPaths.set(championId, chain);
  _startNextHop(championId);
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
  pendingPaths.clear();
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
  if (anim.group && scene) scene.remove(anim.group);
  // Geometries and materials are shared cache entries (shapeFactories,
  // outline) — the group's removal releases them; nothing is disposed here.
  activeAnimations.delete(championId);
}

/** Dispose a completed animation's meshes and materials. */
function _disposeCompleted(anim) {
  if (anim.group && scene) scene.remove(anim.group);
}
