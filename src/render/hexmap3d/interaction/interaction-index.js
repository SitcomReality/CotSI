import { createPanHandlers } from './pan.js';
import { createHoverHandler } from './hover.js';
import { createClickHandler } from './click.js';
import { createZoomHandler } from './zoom.js';
import { createTouchHandlers } from './touch.js';
import { hideTooltip } from './tooltip.js';

/**
 * Wire up 3D canvas events for pan, zoom, hex hover (tooltip), hex click, and touch.
 *
 * Returns a cleanup function that removes all listeners.
 */
export function setupMapInteraction3D(
  canvas,
  applyCamera,
  getCameraState,
  getTerrainMesh,
  onHexClick,
  getTooltipContent
) {
  if (!canvas) return () => {};

  // Shared mutable state across handlers
  const shared = {
    isPanning: false,
    lastPointerX: 0,
    lastPointerY: 0,
    lastTouchDist: 0,
  };

  const pan = createPanHandlers(canvas, getCameraState, applyCamera, shared);
  const hover = createHoverHandler(canvas, getTerrainMesh, getTooltipContent, shared);
  const click = createClickHandler(canvas, getTerrainMesh, onHexClick, shared);
  const zoom = createZoomHandler(getCameraState, applyCamera);

  const touchCtx = { canvas, getCameraState, applyCamera, lastPointerX: 0, lastPointerY: 0, lastTouchDist: 0 };
  const touch = createTouchHandlers(touchCtx);

  // Register pointer events
  canvas.addEventListener('pointerdown', pan.onPointerDown);
  canvas.addEventListener('pointermove', pan.onPointerMove);
  canvas.addEventListener('pointermove', hover);
  canvas.addEventListener('pointerup', pan.onPointerUp);
  canvas.addEventListener('pointerleave', pan.onPointerUp);
  // Wheel zoom
  canvas.addEventListener('wheel', zoom, { passive: false });
  // Touch
  canvas.addEventListener('touchstart', touch.onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', touch.onTouchMove, { passive: false });
  canvas.addEventListener('touchend', touch.onTouchEnd);
  // Click
  canvas.addEventListener('click', click);

  // Cleanup
  return () => {
    canvas.removeEventListener('pointerdown', pan.onPointerDown);
    canvas.removeEventListener('pointermove', pan.onPointerMove);
    canvas.removeEventListener('pointermove', hover);
    canvas.removeEventListener('pointerup', pan.onPointerUp);
    canvas.removeEventListener('pointerleave', pan.onPointerUp);
    canvas.removeEventListener('wheel', zoom);
    canvas.removeEventListener('touchstart', touch.onTouchStart);
    canvas.removeEventListener('touchmove', touch.onTouchMove);
    canvas.removeEventListener('touchend', touch.onTouchEnd);
    canvas.removeEventListener('click', click);
    hideTooltip();
  };
}

