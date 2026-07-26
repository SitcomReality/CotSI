import { zoomCamera } from '../scene/cameraZoomMath.js';
import { ZOOM_STEP_FACTOR } from '../../../params/render/cameraParams.js';

/**
 * Create a wheel handler for zoom.
 *
 * @param {() => CameraState} getCameraState
 * @param {() => void} applyCamera
 * @param {() => void} refreshZoomDisplay
 * @returns {(e: WheelEvent) => void}
 */
export function createZoomHandler(getCameraState, applyCamera, refreshZoomDisplay) {
  return function onWheel(e) {
    e.preventDefault();
    const state = getCameraState();
    if (!state) return;
    const factor = e.deltaY > 0 ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR;
    zoomCamera(state, factor);
    applyCamera();
    refreshZoomDisplay();
  };
}