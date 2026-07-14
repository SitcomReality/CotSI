// src/render/effects/effectsOverlay.js
// Creates a transparent canvas overlaid on the Three.js canvas.
// Handles size syncing, pixel ratio, and provides a registry
// for layered 2D effect renderers.

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
  syncSize();
  
  ctx2d = overlay.getContext('2d');
  
  // Hook into existing tick loop
  sceneContext.onTick((time) => {
    // state and camera are fetched lazily via globals or passed from renderHexMap3D
    // (see Step 4 for wiring)
    if (!overlay._state || !overlay._camera) return;
    renderFrame(overlay._state, overlay._camera, time);
  });
  
  return { overlay, ctx2d, syncSize, registerLayer };
}

function syncSize() {
  if (!threeCanvas || !overlay) return;
  const rect = threeCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  overlay.width = rect.width * dpr;
  overlay.height = rect.height * dpr;
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

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

export { syncSize, registerLayer };