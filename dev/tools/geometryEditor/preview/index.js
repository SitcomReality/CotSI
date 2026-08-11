/**
 * preview.js — Three.js preview for the geometry editor.
 *
 * Standalone dev page (not game UI), so it runs its own render loop on
 * requestAnimationFrame with a dirty flag instead of the game clock. Renders
 * a descriptor through the generic pipeline — recordBuilder → meshAssembly —
 * with the game's toon material and lighting, on a hex tile with a faint ring
 * marking where dispersed clusters land (DECOR_DEEMPHASIS ring 0.68–0.88).
 *
 * Viewport tooling lives here too: click-to-select (raycast on pointer-up when
 * the pointer barely moved), a world-AABB wireframe around the selected node,
 * an always-on origin marker, and a 3-axis translation gizmo. The module stays
 * render-only — it exposes data + callbacks and never reads editor state;
 * main.js supplies the frames, AABB and mutations via
 * bindViewportCallbacks() / updateSelectionOverlay().
 *
 * Orbit: drag rotates, scroll zooms. Dragging a gizmo arrow suppresses orbit.
 *
 * Split across single-purpose modules in preview/: viewportState.js (shared
 * runtime state), scene.js (construction + render loop), floor.js, aabb.js,
 * overlay.js (selection overlay + gizmo), pointer.js (orbit / select / drag).
 * This barrel re-exports the original public API unchanged.
 */
export { createPreview, requestRender, setFloorVisible, showRecords } from './scene.js';
export { worldAABBForPartIds } from './aabb.js';
export { updateSelectionOverlay } from './overlay.js';
export { bindViewportCallbacks } from './viewportState.js';
