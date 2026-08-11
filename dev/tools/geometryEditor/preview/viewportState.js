/**
 * viewportState.js — Shared mutable runtime state for the geometry editor preview.
 *
 * The preview's cross-module handles (renderer, scene, camera, …) live here as
 * one plain object so scene.js, pointer.js, overlay.js and aabb.js can share
 * them without an import cycle. The selection-overlay state (overlayGroup,
 * wireframe, gizmoGroup, originMarker, currentDragInfo) stays in overlay.js as
 * module-level lets — nothing outside the overlay module touches those.
 *
 * Imports nothing local — this is the leaf of the preview module graph.
 */

export const viewport = {
  renderer: null,
  scene: null,
  camera: null,
  objectGroup: null,
  floorGroup: null,
  dirty: true,

  /** The preview's InstancedMeshes keyed by partId (built by the latest showRecords). */
  partIdToMesh: new Map(),
  meshPrefix: '',

  /** Orbit state around TARGET: theta (yaw), phi (pitch), radius (zoom). */
  orbit: { theta: Math.PI / 4, phi: Math.PI / 3.4, radius: 3.6 },

  /** Callbacks wired by the editor (bindViewportCallbacks). */
  viewportCallbacks: { onSelect: null, onMutateLocalPos: null },
};

/** Wire the editor's selection + mutation callbacks (main.js). */
export function bindViewportCallbacks(callbacks) {
  viewport.viewportCallbacks = { onSelect: null, onMutateLocalPos: null, ...callbacks };
}
