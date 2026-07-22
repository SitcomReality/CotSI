/**
 * mapCamera — Reusable camera-focus logic for the 3D hex map.
 *
 * Owns the `lastCenteredChampionId` tracking variable to avoid refocusing
 * on the same champion on every turn-started refresh.
 */
import { centerOnHexWithFixedZoom, animateCenterOnHex, getSceneContext } from '../render/hexmap3d/hexMapRenderer.js';

/** Track which champion we last centered the camera on (by id). */
let lastCenteredChampionId = null;

/**
 * Center the camera on a hex with a smooth animated pan and fixed close-up zoom.
 * Sets the zoom immediately and animates the pan so the view moves smoothly
 * from the current position.
 * @param {number} q - Hex column
 * @param {number} r - Hex row
 * @param {number} [zoomPercent=400] - Zoom level as percentage
 */
export function focusCameraOnHex(q, r, zoomPercent = 400) {
  const ctx = getSceneContext();
  if (!ctx) return;
  const state = ctx.getCameraState();
  // Set zoom immediately, then animate the pan smoothly
  const panFromX = state.targetX, panFromZ = state.targetZ;
  centerOnHexWithFixedZoom(state, q, r, zoomPercent);
  state.targetX = panFromX;
  state.targetZ = panFromZ;
  animateCenterOnHex(state, ctx.applyCamera, q, r);
}

export function getLastCenteredChampionId() {
  return lastCenteredChampionId;
}

export function setLastCenteredChampionId(id) {
  lastCenteredChampionId = id;
}

export function resetCameraFocus() {
  lastCenteredChampionId = null;
}
