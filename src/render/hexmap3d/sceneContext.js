// src/render/hexmap3d/sceneContext.js
// Singleton THREE.js scene context lifecycle.
// Owns the ctx singleton returned by initScene().

import { initScene } from './scene/sceneSetup.js';

/** @type {Object|null} */
let ctx = null;

/**
 * Return the current scene context, or null if not initialized.
 * @returns {Object|null}
 */
export function getSceneContext() {
  return ctx;
}

/**
 * Initialize (or re-initialize) the 3D scene context.
 * @param {Element} mountElement - DOM element to mount the Three.js canvas
 * @param {{ clock: Object, shadows: boolean }} config
 * @returns {Object} The initialized scene context
 */
export function initSceneContext(mountElement, { clock, shadows }) {
  ctx = initScene(mountElement, { clock, shadows });
  return ctx;
}

/**
 * Dispose the scene context, cleaning up all Three.js resources
 * and any stored interaction listeners.
 */
export function disposeSceneContext() {
  if (ctx) {
    // Clean up interaction listeners stored on the context
    if (ctx._interactionCleanup) {
      ctx._interactionCleanup();
      delete ctx._interactionCleanup;
    }
    ctx.dispose();
    ctx = null;
  }
}

/**
 * Dispose a single mesh (geometry + material) and remove from scene.
 * For unit meshes (Groups/InstancedMeshes with no sub-children to recurse into).
 * @param {THREE.Object3D|undefined|null} mesh
 */
export function disposeMesh(mesh) {
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
