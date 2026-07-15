import { zoomCamera } from '../scene/camera.js';

/**
 * Create a wheel handler for zoom.
 *
 * @param {() => CameraState} getCameraState
 * @param {() => void} applyCamera
 * @returns {(e: WheelEvent) => void}
 */
export function createZoomHandler(getCameraState, applyCamera) {
  return function onWheel(e) {
    e.preventDefault();
    const state = getCameraState();
    if (!state) return;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    zoomCamera(state, factor);
    applyCamera();
    refreshZoomDisplay();
  };
}
