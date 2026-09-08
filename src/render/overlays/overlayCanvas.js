// src/render/overlays/overlayCanvas.js
// Creates and manages the transparent overlay canvases on top of the Three.js
// viewport. Two stacked canvases: a static one (fog, movement range, path
// preview) redrawn only when its content changes, and a dynamic one (animated
// selection/interaction indicators) cleared and redrawn every frame. Keeping
// them separate means clearing animated pixels never erases the fog beneath.
// Handles DOM creation, ResizeObserver syncing, and pixel-ratio scaling.

import { OVERLAY_MAX_DPR } from '../../params/render/overlayParams.js';

let staticCanvas = null;
let dynamicCanvas = null;
let staticCtx = null;
let dynamicCtx = null;
let threeCanvas = null;

/**
 * Effective device pixel ratio for the overlay canvases. Capped so the 2D
 * fill/blur/drawImage work stays bounded on HiDPI displays; every overlay
 * module must use this (never raw `devicePixelRatio`) to keep CSS and
 * physical coordinates in agreement.
 * @returns {number}
 */
export function getOverlayDpr() {
  return Math.min(window.devicePixelRatio || 1, OVERLAY_MAX_DPR);
}

function createOverlayCanvas(zIndex) {
  const canvas = document.createElement('canvas');
  canvas.className = 'effects-overlay';
  canvas.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    z-index: ${zIndex};
  `;
  return canvas;
}

/**
 * Set up the overlay canvases, attach them to the DOM, and start the resize observer.
 * Called once during map initialization.
 * @param {{ renderer: { domElement: HTMLCanvasElement }, resize: (w: number, h: number) => void }} sceneContext
 * @returns {{ overlay: HTMLCanvasElement, dynamicOverlay: HTMLCanvasElement, syncSize: () => void }}
 */
export function initOverlayCanvas(sceneContext) {
  threeCanvas = sceneContext.renderer.domElement;

  staticCanvas = createOverlayCanvas(1);
  dynamicCanvas = createOverlayCanvas(2);
  threeCanvas.parentNode.insertBefore(staticCanvas, threeCanvas.nextSibling);
  threeCanvas.parentNode.insertBefore(dynamicCanvas, staticCanvas.nextSibling);

  staticCtx = staticCanvas.getContext('2d');
  dynamicCtx = dynamicCanvas.getContext('2d');

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

    // Align the overlays exactly with the Three.js canvas
    const parentRect = threeCanvas.parentNode.getBoundingClientRect();
    const left = (rect.left - parentRect.left) + 'px';
    const top  = (rect.top  - parentRect.top)  + 'px';
    const dpr = getOverlayDpr();

    for (const [canvas, ctx] of [[staticCanvas, staticCtx], [dynamicCanvas, dynamicCtx]]) {
      canvas.style.left = left;
      canvas.style.top = top;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      // Assigning width/height also clears the canvas — the desired state on resize.
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    updating = false;
  }

  // Observe the Three.js canvas itself — no container re-layout loops
  const resizeObserver = new ResizeObserver(() => updateCanvases());
  resizeObserver.observe(threeCanvas);

  // Initial sync
  updateCanvases();

  return { overlay: staticCanvas, dynamicOverlay: dynamicCanvas, syncSize: updateCanvases };
}

/** The static overlay canvas: fog, movement range, path preview. */
export function getOverlayCanvas() {
  return staticCanvas;
}

/** The per-frame animated overlay canvas: selection ring, interaction hints. */
export function getDynamicOverlayCanvas() {
  return dynamicCanvas;
}

export function getCtx2d() {
  return staticCtx;
}

export function getDynamicCtx2d() {
  return dynamicCtx;
}

// No-op for backwards compatibility – observer handles syncing automatically
export const syncSize = () => {};
