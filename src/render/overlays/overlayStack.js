// src/render/overlays/overlayStack.js
// Orchestrates the overlay canvas, layer registry, and derived-state pipeline.
// Re-exports the full public API from the split modules.

import { initOverlayCanvas, getOverlayCanvas, syncSize } from './overlayCanvas.js';
import { registerLayer } from './overlayRegistry.js';
import { setDerivedState, getDerivedHumanView, getDerivedMoveHighlights } from './derivedState.js';

let overlay = null;

/**
 * Initialize the effects overlay canvas and return the combined API.
 * Called once during map initialization from hexMapRenderer.
 * @param {{ renderer: { domElement: HTMLCanvasElement }, resize: (w: number, h: number) => void }} sceneContext
 * @returns {{ overlay: HTMLCanvasElement, ctx2d: CanvasRenderingContext2D, syncSize: () => void, registerLayer: Function }}
 */
export function initEffectsOverlay(sceneContext) {
  const result = initOverlayCanvas(sceneContext);
  overlay = result.overlay;
  return { ...result, registerLayer };
}

/** Push current state & camera refs onto the overlay so the clock hook picks them up. */
export function setEffectsState(state, camera) {
  if (!overlay) return;
  overlay._state = state;
  overlay._camera = camera;
}

// Re-export the public API consumed by other modules
export {
  registerLayer,
  setDerivedState,
  getDerivedHumanView,
  getDerivedMoveHighlights,
  syncSize,
};
