// src/render/overlays/overlayCanvas.js
// Creates and manages the transparent overlay canvas on top of the Three.js viewport.
// Handles DOM creation, ResizeObserver syncing, pixel-ratio scaling, and the
// Three.js renderer resize side-effect.

let overlay = null;
let ctx2d = null;
let threeCanvas = null;

/**
 * Set up the overlay canvas, attach it to the DOM, and start the resize observer.
 * Called once during map initialization.
 * @param {{ renderer: { domElement: HTMLCanvasElement }, resize: (w: number, h: number) => void }} sceneContext
 * @returns {{ overlay: HTMLCanvasElement, ctx2d: CanvasRenderingContext2D, syncSize: () => void }}
 */
export function initOverlayCanvas(sceneContext) {
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
    if (updating) return;             // prevent cycles
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

  // Observe the Three.js canvas itself — no container re-layout loops
  const resizeObserver = new ResizeObserver(() => updateCanvases());
  resizeObserver.observe(threeCanvas);

  // Initial sync
  updateCanvases();

  return { overlay, ctx2d, syncSize: updateCanvases };
}

export function getOverlayCanvas() {
  return overlay;
}

export function getCtx2d() {
  return ctx2d;
}

// No-op for backwards compatibility – observer handles syncing automatically
export const syncSize = () => {};
