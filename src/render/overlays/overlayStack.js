// src/render/overlays/overlayStack.js
// Creates a transparent canvas overlaid on the Three.js canvas.
// Handles size syncing, pixel ratio, and provides a registry
// for layered 2D effect renderers.

import { getClock } from '../../shared/clockScheduler.js';

let overlay = null;
let ctx2d = null;
let threeCanvas = null;
let renderLayers = [];   // ordered array of { name, priority, render(ctx2d, state, camera, time) }

export function initEffectsOverlay(sceneContext) {
    threeCanvas = sceneContext.renderer.domElement;
    
    overlay = document.createElement('canvas');
    overlay.className = 'effects-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        pointer-events: none;
        z-index: 1;
    `;
    threeCanvas.parentNode.insertBefore(overlay, threeCanvas.nextSibling);
    
    ctx2d = overlay.getContext('2d');
    
    let currentW = 0, currentH = 0;
    let updating = false;                // re-entrancy guard

    function updateCanvases() {
        if (updating) return;            // prevent cycles
        const rect = threeCanvas.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (w === currentW && h === currentH) return;
        currentW = w;
        currentH = h;

        updating = true;
        // Resize the Three.js renderer + camera
        sceneContext.resize(w, h);

        // Align overlay exactly with the Three.js canvas
        const parentRect = threeCanvas.parentNode.getBoundingClientRect();
        overlay.style.left = (rect.left - parentRect.left) + 'px';
        overlay.style.top  = (rect.top  - parentRect.top)  + 'px';
        overlay.style.width  = w + 'px';
        overlay.style.height = h + 'px';

        const dpr = window.devicePixelRatio || 1;
        overlay.width  = w * dpr;
        overlay.height = h * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

        updating = false;
    }

    // Observe the Three.js canvas itself – no container re-layout loops
    const resizeObserver = new ResizeObserver(() => updateCanvases());
    resizeObserver.observe(threeCanvas);

    // Initial sync
    updateCanvases();
  
  // Hook into the clock's tick loop (replaces old sceneContext.onTick)
  getClock().onTick((time) => {
    // state and camera are fetched lazily via globals or passed from renderHexMap3D
    if (!overlay._state || !overlay._camera) return;
    renderFrame(overlay._state, overlay._camera, time);
  });
  
  return { overlay, ctx2d, syncSize: updateCanvases, registerLayer };
}

// No-op for backwards compatibility – observer handles syncing automatically
const syncSize = () => {};

function registerLayer(name, priority, renderFn) {
  renderLayers.push({ name, priority, render: renderFn });
  renderLayers.sort((a, b) => a.priority - b.priority);
}

function renderFrame(state, camera, time) {
  ctx2d.clearRect(0, 0, overlay.width / (window.devicePixelRatio || 1), overlay.height / (window.devicePixelRatio || 1));
  for (const layer of renderLayers) {
    layer.render(ctx2d, state, camera, time);
  }
}

// Called externally to push latest state/camera refs
export function setEffectsState(state, camera) {
  if (!overlay) return;
  overlay._state = state;
  overlay._camera = camera;
}

// ---- Derived state (pre-computed by runtime/, consumed by overlay layers) ----
let _derivedHumanView = null;
let _derivedMoveHighlights = null;

/**
 * Store pre-computed derived data so overlay layers don't need to import
 * from game/state/ directly. Called by runtime/mapRefresh.js.
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView
 * @param {string[]} moveHighlights — hex keys from adjacentPassable
 */
export function setDerivedState(humanView, moveHighlights) {
  _derivedHumanView = humanView;
  _derivedMoveHighlights = moveHighlights;
}

export function getDerivedHumanView() {
  return _derivedHumanView;
}

export function getDerivedMoveHighlights() {
  return _derivedMoveHighlights;
}

export { syncSize, registerLayer };