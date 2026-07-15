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
    if (!overlay._state || !overlay._camera) return;
    syncSize();  // <-- add this line
    renderFrame(overlay._state, overlay._camera, time);
  });
  
  return { overlay, ctx2d, syncSize, registerLayer };
}

function syncSize() {
  if (!threeCanvas || !overlay) return;

  const canvasRect = threeCanvas.getBoundingClientRect();
  const parentRect = overlay.parentNode.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Position overlay to exactly cover the Three.js canvas
  overlay.style.left = (canvasRect.left - parentRect.left) + 'px';
  overlay.style.top  = (canvasRect.top  - parentRect.top)  + 'px';
  overlay.style.width  = canvasRect.width  + 'px';
  overlay.style.height = canvasRect.height + 'px';

  // Set drawing buffer size
  overlay.width  = canvasRect.width  * dpr;
  overlay.height = canvasRect.height * dpr;

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