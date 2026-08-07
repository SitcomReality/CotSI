import { panCamera } from '../scene/cameraPanMath.js';
import { screenToWorldPan } from './panMath.js';
import { hideTooltip } from './hoverTooltip.js';
import { startMeasure, endMeasure } from '../../../dev/performance/index.js';
import { cancelCameraPan } from '../scene/panAnimation.js';
/**
 * Create pan handlers for shift+drag and middle-button drag.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {() => CameraState} getCameraState
 * @param {() => void} applyCamera
 * @param {{ isPanning: boolean, lastPointerX: number, lastPointerY: number }} shared
 * @returns {{ onPointerDown: (e: PointerEvent) => void, onPointerMove: (e: PointerEvent) => void, onPointerUp: (e: PointerEvent) => void }}
 */
export function createPanHandlers(canvas, getCameraState, applyCamera, shared) {
  function onPointerDown(e) {
    if (e.shiftKey || e.button === 1) {
      // User is taking manual control — stop any camera chase so it doesn't
      // fight the drag.
      cancelCameraPan();
      shared.isPanning = true;
      shared.lastPointerX = e.clientX;
      shared.lastPointerY = e.clientY;
      e.preventDefault();
      canvas.style.cursor = 'grabbing';
    }
  }

  function onPointerMove(e) {
    startMeasure('input:pan');
    try {
      if (!shared.isPanning) return;
      const state = getCameraState();
      if (!state) return;

      const dx = e.clientX - shared.lastPointerX;
      const dy = e.clientY - shared.lastPointerY;
      shared.lastPointerX = e.clientX;
      shared.lastPointerY = e.clientY;

      const worldPerPixel = state.frustumSize / canvas.clientHeight;
      const camera = canvas.__camera;
      if (!camera) return;
      const worldDelta = screenToWorldPan(dx, dy, camera);
      panCamera(state, worldDelta.x * worldPerPixel, worldDelta.z * worldPerPixel);
      applyCamera();
      hideTooltip();
    } finally {
      endMeasure('input:pan');
    }
  }

  function onPointerUp(e) {
    if (shared.isPanning) {
      shared.isPanning = false;
      canvas.style.cursor = '';
      e.preventDefault();
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}